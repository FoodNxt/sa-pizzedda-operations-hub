import React, { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function EmailOrdineDialog({ to, iniziale, invio, onInvia, onClose }) {
  const [subject, setSubject] = useState(iniziale.subject);
  const [body, setBody] = useState(iniziale.body);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Email dell'ordine</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">A: {to}</p>
          <div>
            <Label htmlFor="ordine-oggetto">Oggetto</Label>
            <Input id="ordine-oggetto" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ordine-testo">Testo</Label>
            <Textarea id="ordine-testo" rows={14} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={invio}>Annulla</Button>
          <Button onClick={() => onInvia(subject, body)} disabled={invio || !subject.trim() || !body.trim()}>
            {invio ? 'Invio…' : 'Invia email e segna inviato'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}