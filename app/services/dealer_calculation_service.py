from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session, joinedload
from collections import defaultdict

from app.models.dispatch import Dispatch
from app.models.dispatch_item import DispatchItem
from app.models.free_dispatch_item import FreeDispatchItem
from app.models.dispatch_settlement import DispatchSettlement
from app.models.dealer_payment import DealerPayment
from app.models.dealer import Dealer
from app.models.farm import Farm
from app.models.season import Season
from app.common.enum import DealerType


from app.core.rbac import get_partner_scope
from app.models.user import User


class DealerCalculationService:

    @staticmethod
    def _format_box_summary(boxes_20kg: float, boxes_10kg: float, boxes_5kg: float, boxes_dozen: float) -> str:
        parts = []
        if boxes_20kg > 0:
            parts.append(f"20kg: {int(boxes_20kg) if boxes_20kg % 1 == 0 else boxes_20kg}")
        if boxes_10kg > 0:
            parts.append(f"10kg: {int(boxes_10kg) if boxes_10kg % 1 == 0 else boxes_10kg}")
        if boxes_5kg > 0:
            parts.append(f"5kg: {int(boxes_5kg) if boxes_5kg % 1 == 0 else boxes_5kg}")
        if boxes_dozen > 0:
            parts.append(f"Dozen: {int(boxes_dozen) if boxes_dozen % 1 == 0 else boxes_dozen}")
        return " | ".join(parts) if parts else f"20kg: {int(boxes_20kg)} | 10kg: {int(boxes_10kg)} | 5kg: {int(boxes_5kg)} | Dozen: {int(boxes_dozen)}"

    def _prefetch_dispatch_data(self, db: Session, dispatch_ids: list[int]):
        """Helper to batch fetch FreeDispatchItems and DispatchSettlements for a set of dispatches."""
        if not dispatch_ids:
            return {}, {}

        free_items = db.query(FreeDispatchItem).options(
            joinedload(FreeDispatchItem.dispatch_item)
        ).filter(FreeDispatchItem.dispatch_id.in_(dispatch_ids)).all()

        free_by_dispatch: dict[int, list[FreeDispatchItem]] = defaultdict(list)
        for fi in free_items:
            free_by_dispatch[fi.dispatch_id].append(fi)

        settlements = db.query(DispatchSettlement).filter(
            DispatchSettlement.dispatch_id.in_(dispatch_ids)
        ).all()

        settlements_by_dispatch: dict[int, list[DispatchSettlement]] = defaultdict(list)
        for s in settlements:
            settlements_by_dispatch[s.dispatch_id].append(s)

        return free_by_dispatch, settlements_by_dispatch

    def get_season_dealer_summary(self, db: Session, season_id: int = 0, farm_id: int = None, current_user: User | None = None):
        """
        Returns a list of dealers with their calculated totals for a given season (or all seasons if season_id is 0 or None).
        Each dealer entry includes: gross, free deductions, commission, transport,
        damage, calculated amount, payments received, and pending amount.
        """
        # Load all dispatches for this season (or all seasons if season_id is 0/None) with related data
        query = db.query(Dispatch).options(
            joinedload(Dispatch.dealer),
            joinedload(Dispatch.items).joinedload(DispatchItem.farm),
        )
        if season_id and season_id != 0:
            query = query.filter(Dispatch.season_id == season_id)

        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                query = query.filter(Dispatch.season_id.in_(scope["season_ids"]))

        dispatches = query.order_by(Dispatch.dispatch_date.asc(), Dispatch.id.asc()).all()

        # Optionally filter by farm / partner farms
        allowed_farm_ids = None
        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                allowed_farm_ids = scope["farm_ids"]
                dispatches = [d for d in dispatches if any(it.farm_id in scope["farm_ids"] for it in d.items)]

        if farm_id:
            dispatches = [d for d in dispatches if any(it.farm_id == farm_id for it in d.items)]

        if not dispatches:
            return []

        # Batch prefetch free items and settlements
        dispatch_ids = [d.id for d in dispatches]
        free_by_dispatch, settlements_by_dispatch = self._prefetch_dispatch_data(db, dispatch_ids)

        # Batch prefetch seasons
        all_seasons = db.query(Season).all()
        target_season = next((s for s in all_seasons if s.id == season_id), None) if season_id else None

        # Group dispatches by dealer
        dealer_dispatches: dict[int, list[Dispatch]] = defaultdict(list)
        for d in dispatches:
            dealer_dispatches[d.dealer_id].append(d)

        # Batch prefetch dealer payments
        dealer_ids = list(dealer_dispatches.keys())
        all_payments = db.query(DealerPayment).filter(
            DealerPayment.dealer_id.in_(dealer_ids)
        ).order_by(DealerPayment.payment_date.asc(), DealerPayment.id.asc()).all()
        payments_by_dealer: dict[int, list[DealerPayment]] = defaultdict(list)
        for p in all_payments:
            payments_by_dealer[p.dealer_id].append(p)

        results = []
        for dealer_id, dealer_dispatch_list in dealer_dispatches.items():
            dealer_dispatch_list.sort(key=lambda d: (str(d.dispatch_date or ""), d.id))
            dealer = dealer_dispatch_list[0].dealer
            dealer_calc = self._calculate_dealer_summary(
                db, dealer, dealer_dispatch_list, farm_id, season_id,
                allowed_farm_ids=allowed_farm_ids,
                free_by_dispatch=free_by_dispatch,
                settlements_by_dispatch=settlements_by_dispatch,
                all_seasons=all_seasons,
                target_season=target_season,
                dealer_payments=payments_by_dealer.get(dealer.id, [])
            )
            results.append(dealer_calc)

        # Sort by dealer name
        results.sort(key=lambda x: x["dealer_name"])
        return results

    def get_season_farm_dispatches(self, db: Session, season_id: int, farm_id: int, current_user: User | None = None):
        """
        Returns all dispatches for a given season and farm with per-dispatch calculations.
        Sorted by dispatch_date ascending.
        """
        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                if season_id not in scope["season_ids"] or farm_id not in scope["farm_ids"]:
                    return []

        query = db.query(Dispatch).options(
            joinedload(Dispatch.dealer),
            joinedload(Dispatch.items).joinedload(DispatchItem.farm),
        ).filter(
            Dispatch.season_id == season_id
        ).order_by(Dispatch.dispatch_date.asc(), Dispatch.id.asc())

        dispatches = query.all()
        # Filter to dispatches that have items belonging to this farm
        dispatches = [d for d in dispatches if any(it.farm_id == farm_id for it in d.items)]

        if not dispatches:
            return []

        dispatch_ids = [d.id for d in dispatches]
        free_by_dispatch, settlements_by_dispatch = self._prefetch_dispatch_data(db, dispatch_ids)

        results = []
        for dispatch in dispatches:
            calc = self._calculate_dispatch(
                db, dispatch, farm_id,
                free_items_list=free_by_dispatch.get(dispatch.id),
                settlements_list=settlements_by_dispatch.get(dispatch.id)
            )
            s = calc["summary"]

            boxes_20kg = sum(float(it["box_quantity"]) for it in calc["items"] if str(it.get("box_size_kg")) == "20")
            boxes_10kg = sum(float(it["box_quantity"]) for it in calc["items"] if str(it.get("box_size_kg")) == "10")
            boxes_5kg = sum(float(it["box_quantity"]) for it in calc["items"] if str(it.get("box_size_kg")) == "5")
            boxes_dozen = sum(float(it["box_quantity"]) for it in calc["items"] if str(it.get("box_size_kg", "")).upper() == "DOZEN")
            total_boxes = sum(float(it["box_quantity"]) for it in calc["items"])

            box_summary_str = self._format_box_summary(boxes_20kg, boxes_10kg, boxes_5kg, boxes_dozen)


            farm_names = []
            seen_farms = set()
            for it in calc["items"]:
                fn = it.get("farm_name")
                if fn and fn != "Unknown" and fn not in seen_farms:
                    seen_farms.add(fn)
                    farm_names.append(fn)
            farms_str = ", ".join(farm_names) if farm_names else "-"

            dealer = dispatch.dealer
            results.append({
                "dispatch_id": calc["dispatch_id"],
                "dispatch_no": calc["dispatch_no"],
                "dispatch_date": calc["dispatch_date"],
                "dealer_id": dispatch.dealer_id,
                "dealer_name": dealer.name if dealer else "",
                "status": calc["status"],
                "farms": farms_str,
                "farm_names": farm_names,
                "boxes_20kg": boxes_20kg,
                "boxes_10kg": boxes_10kg,
                "boxes_5kg": boxes_5kg,
                "boxes_dozen": boxes_dozen,
                "total_boxes": total_boxes,
                "box_summary": box_summary_str,
                "gross_amount": s["gross_amount"],
                "free_deduction": s["free_deduction"],
                "commission": s["commission"],
                "transport": s["transport"],
                "damage": s["damage"],
                "net_amount": s["net_amount"],
                "dealer_total_amount": s["dealer_total_amount"],
            })

        results.sort(key=lambda x: (str(x["dispatch_date"] or ""), x["dispatch_id"]))
        return results

    def get_dealer_dispatches(self, db: Session, season_id: int, dealer_id: int, farm_id: int = None, current_user: User | None = None):
        """
        Returns all dispatches for a dealer in a season (or all seasons if season_id=0) with per-dispatch calculation.
        """
        query = db.query(Dispatch).options(
            joinedload(Dispatch.dealer),
            joinedload(Dispatch.items).joinedload(DispatchItem.farm),
        ).filter(
            Dispatch.dealer_id == dealer_id
        )
        if season_id and season_id != 0:
            query = query.filter(Dispatch.season_id == season_id)

        allowed_farm_ids = None
        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                allowed_farm_ids = scope["farm_ids"]
                query = query.filter(Dispatch.season_id.in_(scope["season_ids"]))

        dispatches = query.order_by(Dispatch.dispatch_date.asc(), Dispatch.id.asc()).all()

        if allowed_farm_ids:
            dispatches = [d for d in dispatches if any(it.farm_id in allowed_farm_ids for it in d.items)]

        if farm_id:
            dispatches = [d for d in dispatches if any(it.farm_id == farm_id for it in d.items)]

        results = []
        for dispatch in dispatches:
            calc = self._calculate_dispatch(db, dispatch, farm_id, allowed_farm_ids=allowed_farm_ids)
            results.append(calc)

        return results

    def get_dispatch_calculation(self, db: Session, dispatch_id: int, farm_id: int = None, current_user: User | None = None):
        """
        Returns the full item-level calculation for a single dispatch.
        """
        dispatch = db.query(Dispatch).options(
            joinedload(Dispatch.dealer),
            joinedload(Dispatch.items).joinedload(DispatchItem.farm),
        ).filter(Dispatch.id == dispatch_id).first()

        if not dispatch:
            return None

        allowed_farm_ids = None
        if current_user:
            scope = get_partner_scope(db, current_user)
            if not scope["is_admin"] and scope["is_partner"]:
                if dispatch.season_id not in scope["season_ids"]:
                    return None
                allowed_farm_ids = scope["farm_ids"]

        return self._calculate_dispatch(db, dispatch, farm_id=farm_id, allowed_farm_ids=allowed_farm_ids)

    # ─────────────────────────────────────────────────────────────
    #  Core Calculation Helpers
    # ─────────────────────────────────────────────────────────────

    def _calculate_dispatch(
        self,
        db: Session,
        dispatch: Dispatch,
        farm_id: int = None,
        allowed_farm_ids: list[int] = None,
        free_items_list: list[FreeDispatchItem] = None,
        settlements_list: list[DispatchSettlement] = None
    ):
        """
        Full calculation for a single dispatch, broken down by farm/source.
        """
        items = dispatch.items
        if farm_id:
            items = [it for it in items if it.farm_id == farm_id]
        elif allowed_farm_ids is not None:
            items = [it for it in items if it.farm_id in allowed_farm_ids]

        # Load free dispatch items for this dispatch (use prefetched if provided)
        if free_items_list is not None:
            free_items = free_items_list
        else:
            free_items = db.query(FreeDispatchItem).options(
                joinedload(FreeDispatchItem.dispatch_item)
            ).filter(FreeDispatchItem.dispatch_id == dispatch.id).all()

        if farm_id:
            free_items = [fi for fi in free_items if fi.dispatch_item and fi.dispatch_item.farm_id == farm_id]
        elif allowed_farm_ids is not None:
            free_items = [fi for fi in free_items if fi.dispatch_item and fi.dispatch_item.farm_id in allowed_farm_ids]

        # Load settlements (damage) for this dispatch (use prefetched if provided)
        if settlements_list is not None:
            settlements = settlements_list
        else:
            settlements = db.query(DispatchSettlement).filter(
                DispatchSettlement.dispatch_id == dispatch.id
            ).all()

        total_loss = sum(Decimal(str(s.loss_amount or 0)) for s in settlements)

        # Map free items by dispatch_item_id for easy lookup
        free_by_item: dict[int, list[FreeDispatchItem]] = defaultdict(list)
        for fi in free_items:
            if fi.dispatch_item_id:
                free_by_item[fi.dispatch_item_id].append(fi)

        # Group items by farm
        farm_groups: dict[int | None, list[DispatchItem]] = defaultdict(list)
        for item in items:
            farm_groups[item.farm_id].append(item)

        # Calculate damage per farm based on all unique farms in the dispatch
        total_unique_farms = len({it.farm_id for it in dispatch.items})
        damage_per_farm = (
            (Decimal(str(total_loss)) / total_unique_farms).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            if total_unique_farms > 0 else Decimal("0.00")
        )

        dealer = dispatch.dealer
        total_dispatch_weight = sum(Decimal(str(it.total_weight_kg or 0)) for it in dispatch.items)

        farm_breakdowns = []
        dispatch_gross = Decimal("0")
        dispatch_free = Decimal("0")
        dispatch_commission = Decimal("0")
        dispatch_transport = Decimal("0")
        dispatch_damage = Decimal("0")
        dispatch_net = Decimal("0")

        for farm_id_key, farm_items in farm_groups.items():
            farm = farm_items[0].farm if farm_items else None
            breakdown = self._calculate_farm_breakdown(
                farm=farm,
                items=farm_items,
                free_by_item=free_by_item,
                dealer=dealer,
                dispatch_transport_charge=Decimal(str(dispatch.transport_charge or 0)),
                total_dispatch_weight=total_dispatch_weight,
                damage_per_farm=damage_per_farm,
            )
            farm_breakdowns.append(breakdown)
            dispatch_gross += Decimal(str(breakdown["gross_amount"]))
            dispatch_free += Decimal(str(breakdown["free_deduction"]))
            dispatch_commission += Decimal(str(breakdown["commission"]))
            dispatch_transport += Decimal(str(breakdown["transport"]))
            dispatch_damage += Decimal(str(breakdown["damage"]))
            dispatch_net += Decimal(str(breakdown["net_amount"]))

        # Build item-level rows for display
        item_rows = []
        for it in items:
            free_qty = sum(
                Decimal(str(fi.box_quantity or 0)) for fi in free_by_item.get(it.id, [])
            )
            free_amount = free_qty * Decimal(str(it.price_per_box or 0))
            item_rows.append({
                "id": it.id,
                "farm_id": it.farm_id,
                "farm_name": it.farm.name if it.farm else ("Market" if str(it.source_type).upper() == "MARKET" else "Unknown"),
                "farm_type": it.farm.farm_type if it.farm else "OWN",
                "source_type": it.source_type,
                "variety": it.variety or "",
                "grade": it.grade or "",
                "box_size_kg": it.box_size_kg,
                "box_quantity": float(it.box_quantity),
                "price_per_box": float(it.price_per_box),
                "total_weight_kg": float(it.total_weight_kg),
                "gross_amount": float(it.total_amount),
                "free_boxes": float(free_qty),
                "free_amount": float(free_amount),
            })

        # Settlement details
        settlement_rows = [
            {
                "id": s.id,
                "settlement_date": str(s.settlement_date) if s.settlement_date else None,
                "loss_amount": float(s.loss_amount),
                "loss_remarks": s.loss_remarks,
            }
            for s in settlements
        ]

        # Free dispatch item details (sister/relative boxes given away)
        free_item_rows = []
        for fi in free_items:
            linked_item = fi.dispatch_item
            if farm_id and linked_item and linked_item.farm_id != farm_id:
                continue
            free_item_rows.append({
                "id": fi.id,
                "distribution_date": str(fi.distribution_date) if fi.distribution_date else None,
                "box_quantity": float(fi.box_quantity or 0),
                "remarks": fi.remarks or "",
                "dispatch_item_id": fi.dispatch_item_id,
                "variety": linked_item.variety if linked_item else "",
                "grade": linked_item.grade if linked_item else "",
                "box_size_kg": linked_item.box_size_kg if linked_item else "",
                "price_per_box": float(linked_item.price_per_box) if linked_item else 0.0,
                "free_amount": float(fi.box_quantity or 0) * float(linked_item.price_per_box if linked_item else 0),
                "farm_name": (linked_item.farm.name if linked_item and linked_item.farm else "") if linked_item else "",
            })

        return {
            "dispatch_id": dispatch.id,
            "dispatch_no": dispatch.dispatch_no,
            "dispatch_date": str(dispatch.dispatch_date) if dispatch.dispatch_date else None,
            "dealer_id": dispatch.dealer_id,
            "dealer_name": dealer.name if dealer else "",
            "dealer_city": dealer.city if dealer else "",
            "vehicle_no": dispatch.vehicle_no,
            "transport_name": dispatch.transport_name,
            "transport_charge": float(dispatch.transport_charge or 0),
            "status": dispatch.status,
            "items": item_rows,
            "free_items": free_item_rows,
            "settlements": settlement_rows,
            "farm_breakdowns": farm_breakdowns,
            "summary": {
                "gross_amount": float(dispatch_gross),
                "free_deduction": float(dispatch_free),
                "commission": float(dispatch_commission),
                "transport": float(dispatch_transport),
                "damage": float(dispatch_damage),
                "net_amount": float(dispatch_net),
                "dealer_total_amount": float(dispatch.total_amount or 0),
            },
        }

    def _calculate_farm_breakdown(
        self,
        farm,
        items: list[DispatchItem],
        free_by_item: dict,
        dealer: Dealer,
        dispatch_transport_charge: Decimal,
        total_dispatch_weight: Decimal,
        damage_per_farm: Decimal,
    ) -> dict:
        gross = sum(Decimal(str(it.total_amount or 0)) for it in items)
        farm_weight = sum(Decimal(str(it.total_weight_kg or 0)) for it in items)
        total_boxes = sum(Decimal(str(it.box_quantity or 0)) for it in items)

        # Free/sister deduction
        free_deduction = Decimal("0")
        for it in items:
            for fi in free_by_item.get(it.id, []):
                free_deduction += Decimal(str(fi.box_quantity or 0)) * Decimal(str(it.price_per_box or 0))

        taxable = gross - free_deduction

        # Commission
        commission = Decimal("0")
        if dealer:
            commission_type = dealer.commission_type
            commission_value = Decimal(str(dealer.commission_value or 0))
            if commission_type == DealerType.PERCENTAGE:
                commission = (taxable * commission_value / 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            elif commission_type == DealerType.FIXED:
                commission = (total_boxes * commission_value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            # NONE: commission = 0

        # Transport (proportional by weight)
        transport = Decimal("0")
        if total_dispatch_weight > 0:
            transport = (dispatch_transport_charge * farm_weight / total_dispatch_weight).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )

        net = taxable - commission - transport - damage_per_farm

        return {
            "farm_id": farm.id if farm else None,
            "farm_name": farm.name if farm else "Unknown",
            "farm_type": farm.farm_type if farm else "OWN",
            "gross_amount": float(gross),
            "free_deduction": float(free_deduction),
            "taxable_amount": float(taxable),
            "commission": float(commission),
            "transport": float(transport),
            "damage": float(damage_per_farm),
            "net_amount": float(net),
        }

    def _calculate_dealer_summary(
        self,
        db: Session,
        dealer: Dealer,
        dispatches: list[Dispatch],
        farm_id: int = None,
        season_id: int = 0,
        allowed_farm_ids: list[int] = None,
        free_by_dispatch: dict[int, list[FreeDispatchItem]] = None,
        settlements_by_dispatch: dict[int, list[DispatchSettlement]] = None,
        all_seasons: list[Season] = None,
        target_season: Season = None,
        dealer_payments: list[DealerPayment] = None
    ):
        """Aggregate all dispatch calculations for one dealer."""
        total_gross = Decimal("0")
        total_free = Decimal("0")
        total_commission = Decimal("0")
        total_transport = Decimal("0")
        total_damage = Decimal("0")
        total_net = Decimal("0")
        all_free_items = []

        dispatch_summaries = []
        for dispatch in dispatches:
            calc = self._calculate_dispatch(
                db, dispatch, farm_id,
                allowed_farm_ids=allowed_farm_ids,
                free_items_list=free_by_dispatch.get(dispatch.id) if free_by_dispatch is not None else None,
                settlements_list=settlements_by_dispatch.get(dispatch.id) if settlements_by_dispatch is not None else None
            )
            if calc.get("free_items"):
                all_free_items.extend(calc["free_items"])
            s = calc["summary"]
            total_gross += Decimal(str(s["gross_amount"]))
            total_free += Decimal(str(s["free_deduction"]))
            total_commission += Decimal(str(s["commission"]))
            total_transport += Decimal(str(s["transport"]))
            total_damage += Decimal(str(s["damage"]))
            total_net += Decimal(str(s["net_amount"]))

            boxes_20kg = sum(float(it["box_quantity"]) for it in calc["items"] if str(it.get("box_size_kg")) == "20")
            boxes_10kg = sum(float(it["box_quantity"]) for it in calc["items"] if str(it.get("box_size_kg")) == "10")
            boxes_5kg = sum(float(it["box_quantity"]) for it in calc["items"] if str(it.get("box_size_kg")) == "5")
            boxes_dozen = sum(float(it["box_quantity"]) for it in calc["items"] if str(it.get("box_size_kg", "")).upper() == "DOZEN")
            total_boxes = sum(float(it["box_quantity"]) for it in calc["items"])

            box_summary_str = self._format_box_summary(boxes_20kg, boxes_10kg, boxes_5kg, boxes_dozen)

            # Unique farm names for this dispatch
            farm_names = []
            seen_farms = set()
            for it in calc["items"]:
                fn = it.get("farm_name")
                if fn and fn != "Unknown" and fn not in seen_farms:
                    seen_farms.add(fn)
                    farm_names.append(fn)
            farms_str = ", ".join(farm_names) if farm_names else "-"

            dispatch_summaries.append({
                "dispatch_id": calc["dispatch_id"],
                "dispatch_no": calc["dispatch_no"],
                "dispatch_date": calc["dispatch_date"],
                "dealer_id": dealer.id if dealer else None,
                "dealer_name": dealer.name if dealer else "",
                "status": calc["status"],
                "farms": farms_str,
                "farm_names": farm_names,
                "boxes_20kg": boxes_20kg,
                "boxes_10kg": boxes_10kg,
                "boxes_5kg": boxes_5kg,
                "boxes_dozen": boxes_dozen,
                "total_boxes": total_boxes,
                "box_summary": box_summary_str,
                "gross_amount": s["gross_amount"],
                "free_deduction": s["free_deduction"],
                "commission": s["commission"],
                "transport": s["transport"],
                "damage": s["damage"],
                "net_amount": s["net_amount"],
                "dealer_total_amount": s["dealer_total_amount"],
            })

        # Sort dispatch summaries ascending by dispatch_date
        dispatch_summaries.sort(key=lambda x: (str(x["dispatch_date"] or ""), x["dispatch_id"]))

        # Sort free items ascending by distribution_date (oldest first)
        all_free_items.sort(key=lambda x: (str(x["distribution_date"] or ""), x["id"]))

        # All payments for this dealer
        if dealer_payments is not None:
            all_dealer_payments = dealer_payments
        else:
            all_dealer_payments = db.query(DealerPayment).filter(
                DealerPayment.dealer_id == dealer.id
            ).order_by(DealerPayment.payment_date.asc(), DealerPayment.id.asc()).all()

        previous_balance = Decimal("0")
        current_payments = []

        if season_id and season_id != 0:
            if all_seasons is None:
                all_seasons = db.query(Season).all()
            if target_season is None:
                target_season = next((s for s in all_seasons if s.id == season_id), None)

            prior_season_ids = []
            for s in all_seasons:
                if s.id == season_id:
                    continue
                if target_season and target_season.start_date and s.start_date:
                    if s.start_date < target_season.start_date:
                        prior_season_ids.append(s.id)
                elif s.id < season_id:
                    prior_season_ids.append(s.id)

            if prior_season_ids:
                prior_dispatches = db.query(Dispatch).options(
                    joinedload(Dispatch.dealer),
                    joinedload(Dispatch.items).joinedload(DispatchItem.farm),
                ).filter(
                    Dispatch.dealer_id == dealer.id,
                    Dispatch.season_id.in_(prior_season_ids)
                ).all()

                prior_net = Decimal("0")
                for pd in prior_dispatches:
                    pd_calc = self._calculate_dispatch(db, pd)
                    prior_net += Decimal(str(pd_calc["summary"]["net_amount"]))

                prior_paid = Decimal("0")
                for p in all_dealer_payments:
                    if p.season_id in prior_season_ids:
                        prior_paid += Decimal(str(p.amount or 0))
                    elif p.season_id is None:
                        if target_season and target_season.start_date and p.payment_date and p.payment_date < target_season.start_date:
                            prior_paid += Decimal(str(p.amount or 0))

                previous_balance = prior_net - prior_paid

            # Current season payments
            for p in all_dealer_payments:
                if p.season_id == season_id:
                    current_payments.append(p)
                elif p.season_id is None:
                    if target_season and target_season.start_date and target_season.end_date and p.payment_date:
                        if target_season.start_date <= p.payment_date <= target_season.end_date:
                            current_payments.append(p)
        else:
            # All seasons
            current_payments = all_dealer_payments
            previous_balance = Decimal("0")

        total_paid = sum(Decimal(str(p.amount or 0)) for p in current_payments)
        pending = total_net - total_paid
        grand_pending = pending + previous_balance

        payment_rows = [
            {
                "id": p.id,
                "season_id": p.season_id,
                "payment_date": str(p.payment_date) if p.payment_date else None,
                "amount": float(p.amount or 0),
                "payment_mode": p.payment_mode,
                "reference_no": p.reference_no,
                "remarks": p.remarks,
            }
            for p in current_payments
        ]

        return {
            "dealer_id": dealer.id,
            "dealer_name": dealer.name,
            "dealer_city": dealer.city or "",
            "dealer_mobile": dealer.mobile or "",
            "commission_type": dealer.commission_type,
            "commission_value": float(dealer.commission_value or 0),
            "dispatch_count": len(dispatches),
            "dispatches": dispatch_summaries,
            "free_items": all_free_items,
            "totals": {
                "gross_amount": float(total_gross),
                "free_deduction": float(total_free),
                "commission": float(total_commission),
                "transport": float(total_transport),
                "damage": float(total_damage),
                "net_amount": float(total_net),
                "previous_balance": float(previous_balance),
                "total_paid": float(total_paid),
                "pending_amount": float(pending),
                "grand_pending_amount": float(grand_pending),
            },
            "payments": payment_rows,
        }

