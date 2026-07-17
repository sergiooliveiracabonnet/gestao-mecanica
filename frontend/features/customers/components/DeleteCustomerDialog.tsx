'use client';

import { toast } from 'sonner';
import type { CustomerListItemResponse } from '@oficina/contracts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { extractErrorMessage } from '@/lib/api/client';
import { useDeleteCustomer } from '../hooks/use-customers';

interface DeleteCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerListItemResponse | null;
}

export function DeleteCustomerDialog({ open, onOpenChange, customer }: DeleteCustomerDialogProps) {
  const deleteCustomer = useDeleteCustomer();

  function handleConfirm() {
    if (!customer) {
      return;
    }
    deleteCustomer.mutate(
      { id: customer.id },
      {
        onSuccess: () => {
          toast.success(`Cliente ${customer.name} removido.`);
          onOpenChange(false);
        },
        onError: (error) => toast.error(extractErrorMessage(error)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir cliente</DialogTitle>
          <DialogDescription>
            Tem certeza que quer excluir <strong>{customer?.name}</strong>? Este cliente pode ter veículos ou ordens de
            serviço vinculados — o histórico deles não é afetado, mas o cliente deixa de aparecer na lista.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={deleteCustomer.isPending} onClick={handleConfirm}>
            {deleteCustomer.isPending ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
