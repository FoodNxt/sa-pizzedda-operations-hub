import React from 'react';
import ProtectedPage from '@/components/ProtectedPage';
import LaboratorioForm from '@/components/laboratorio/LaboratorioForm';

export default function LaboratorioProduzioni() {
  return (
    <ProtectedPage pageName="LaboratorioProduzioni">
      <LaboratorioForm />
    </ProtectedPage>
  );
}