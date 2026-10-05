import React, { useEffect, useState } from 'react';
import {
  IconButton,
  Tooltip,
  TextField,
  FormControlLabel,
  Switch,
  Box,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import StatusChip from '../../components/common/StatusChip';
import FormModal from '../../components/forms/FormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import productService from '../../services/productService';
import { Product, ProductRequest } from '../../types/product';

export const ProductsPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const { can } = useAuth();

  const canCreate = can('create', 'product');
  const canEdit = can('update', 'product');
  const canDelete = can('delete', 'product');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form fields
  const [formData, setFormData] = useState<ProductRequest>({
    name: '',
    description: '',
    is_active: true,
  });

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await productService.getAll();
      setProducts(data);
    } catch (e) {
      showError('Failed to load products.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      is_active: true,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      is_active: product.is_active,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setModalError('Product / Crop Name is required.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    try {
      if (editingProduct) {
        await productService.update(editingProduct.id, formData);
        showSuccess('Product updated successfully!');
      } else {
        await productService.create(formData);
        showSuccess('Product created successfully!');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to save product.';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setDeleteLoading(true);

    try {
      await productService.delete(productToDelete.id);
      showSuccess(`Product "${productToDelete.name}" deleted.`);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to delete product. Check for related dispatches.';
      showError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: Column<Product>[] = [
    { id: 'name', label: 'Crop / Product Name', minWidth: 180, sortValue: (row) => row.name },
    {
      id: 'description',
      label: 'Description / Notes',
      minWidth: 250,
      sortValue: (row) => row.description || '',
      render: (row) => row.description || '-',
    },
    {
      id: 'is_active',
      label: 'Status',
      minWidth: 120,
      sortValue: (row) => (row.is_active ? 1 : 0),
      render: (row) => <StatusChip status={row.is_active} />,
    },
    ...(canEdit || canDelete
      ? [
          {
            id: 'actions',
            label: 'Actions',
            align: 'right' as const,
            minWidth: 100,
            sortable: false,
            render: (row: Product) => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                {canEdit && (
                  <Tooltip title="Edit Product">
                    <IconButton size="small" onClick={() => handleOpenEdit(row)} sx={{ color: '#0284c7' }}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {canDelete && (
                  <Tooltip title="Delete Product">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setProductToDelete(row);
                        setDeleteDialogOpen(true);
                      }}
                      sx={{ color: '#ef4444' }}
                    >
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            ),
          },
        ]
      : []),
  ];

  return (
    <Box>
      <PageHeader
        title="Products & Crops"
        subtitle="Catalogue of crops, produce types, and harvest varieties"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Products' }]}
        actionLabel={canCreate ? 'Add Product' : undefined}
        onAction={canCreate ? handleOpenCreate : undefined}
      />

      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        defaultSortBy="name"
        searchPlaceholder="Search crop or produce name..."
        searchField={(row) => `${row.name} ${row.description || ''}`}
        emptyMessage="No products registered yet."
      />

      {/* Create / Edit Modal */}
      <FormModal
        open={isModalOpen}
        title={editingProduct ? 'Edit Product' : 'Register New Crop / Product'}
        subtitle={editingProduct ? `Editing ${editingProduct.name}` : 'Enter produce details'}
        loading={modalLoading}
        error={modalError}
        submitLabel={editingProduct ? 'Update Product' : 'Create Product'}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      >
        <TextField
          label="Product / Crop Name"
          required
          fullWidth
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Kesar Mango, Lemon, Pomegranate"
        />

        <TextField
          label="Description / Variety Details"
          fullWidth
          multiline
          rows={3}
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="e.g. Premium Grade A Organic Mango from Talala orchard"
        />

        <FormControlLabel
          control={
            <Switch
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              color="primary"
            />
          }
          label="Active Product"
        />
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Product"
        message="Are you sure you want to delete this crop product?"
        itemName={productToDelete?.name}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setDeleteDialogOpen(false);
          setProductToDelete(null);
        }}
      />
    </Box>
  );
};

export default ProductsPage;
