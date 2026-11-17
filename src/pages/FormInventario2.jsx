import React from 'react';
import ProtectedPage from '@/components/ProtectedPage';
import ConteggioForm from '@/components/inventario2/conteggio/ConteggioForm';

export default function FormInventario2() {
  return (
    <ProtectedPage pageName="FormInventario2">
      <ConteggioForm />
    </ProtectedPage>
  );
}