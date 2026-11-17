import React from 'react';
import ProtectedPage from '@/components/ProtectedPage';
import TrasportoForm from '@/components/trasporti/TrasportoForm';

export default function TrasportiMagazzino() {
  return (
    <ProtectedPage pageName="TrasportiMagazzino">
      <TrasportoForm />
    </ProtectedPage>
  );
}