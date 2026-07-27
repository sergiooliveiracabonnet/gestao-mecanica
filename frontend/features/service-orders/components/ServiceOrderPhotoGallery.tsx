'use client';

import type { ServiceOrderPhotoCategory, ServiceOrderPhotoResponse } from '@oficina/contracts';
import { Camera, ImagePlus, LoaderCircle, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { extractErrorMessage } from '@/lib/api/client';
import { useDeleteServiceOrderPhoto, useServiceOrderPhotoBlob, useServiceOrderPhotos, useUploadServiceOrderPhoto } from '../hooks/use-service-orders';

const GROUPS: Array<{ category: ServiceOrderPhotoCategory; title: string; description: string; empty: string }> = [
  { category: 'ENTRY', title: 'Entrada do veículo', description: 'Estado geral, avarias existentes, painel e quilometragem.', empty: 'Registre como o veículo chegou à oficina.' },
  { category: 'ISSUE', title: 'Problemas encontrados', description: 'Peças danificadas, vazamentos, desgaste e evidências do diagnóstico.', empty: 'Adicione evidências dos problemas identificados.' },
  { category: 'RESOLVED', title: 'Problemas corrigidos', description: 'Comprovação visual do reparo e das peças instaladas.', empty: 'Mostre o resultado de cada correção realizada.' },
  { category: 'EXIT', title: 'Saída do veículo', description: 'Estado final do veículo antes da entrega ao cliente.', empty: 'Registre como o veículo deixou a oficina.' },
];

export function ServiceOrderPhotoGallery({ serviceOrderId, canManage }: { serviceOrderId: string; canManage: boolean }) {
  const query = useServiceOrderPhotos(serviceOrderId);
  const [selected, setSelected] = useState<ServiceOrderPhotoResponse | null>(null);
  const grouped = useMemo(() => new Map(GROUPS.map((group) => [group.category, (query.data?.photos ?? []).filter((photo) => photo.category === group.category)])), [query.data?.photos]);

  return <section aria-labelledby="vehicle-photos-title" className="rounded-card border border-border bg-card p-4 shadow-sm sm:p-5">
    <header className="flex items-start gap-3 border-b border-border pb-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-button bg-primary-subtle text-primary"><Camera className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Evidências da OS</p><h3 id="vehicle-photos-title" className="mt-1 text-lg font-bold">Registro fotográfico do veículo</h3><p className="mt-1 text-sm text-text-muted">Acompanhe visualmente da entrada até a entrega.</p></div></header>
    {query.isLoading && <div className="flex h-40 items-center justify-center text-text-muted"><LoaderCircle className="size-6 animate-spin" /></div>}
    {query.isError && <p className="py-8 text-center text-sm font-semibold text-danger">Não foi possível carregar as fotos.</p>}
    {!query.isLoading && !query.isError && <div>
      {GROUPS.map((group, index) => <div key={group.category} className={index === 2 ? 'mt-8 border-t-2 border-border pt-8' : index > 0 ? 'mt-7 border-t border-border pt-7' : 'pt-5'}>
        <PhotoGroup serviceOrderId={serviceOrderId} group={group} photos={grouped.get(group.category) ?? []} canManage={canManage} onSelect={setSelected} />
      </div>)}
    </div>}
    <PhotoViewer photo={selected} onClose={() => setSelected(null)} canManage={canManage} serviceOrderId={serviceOrderId} />
  </section>;
}

function PhotoGroup({ serviceOrderId, group, photos, canManage, onSelect }: { serviceOrderId: string; group: (typeof GROUPS)[number]; photos: ServiceOrderPhotoResponse[]; canManage: boolean; onSelect: (photo: ServiceOrderPhotoResponse) => void }) {
  const upload = useUploadServiceOrderPhoto();
  const input = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState('');

  async function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    if (!files.length) return;
    try {
      for (const file of files) await upload.mutateAsync({ serviceOrderId, category: group.category, caption, file });
      toast.success(`${files.length} ${files.length === 1 ? 'foto adicionada' : 'fotos adicionadas'}.`);
      setCaption('');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível enviar uma das fotos.'));
    } finally {
      event.target.value = '';
    }
  }

  return <section aria-labelledby={`photo-group-${group.category}`}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h4 id={`photo-group-${group.category}`} className="font-bold text-text">{group.title} <span className="ml-1 text-xs font-semibold text-text-muted">{photos.length}</span></h4><p className="mt-1 text-xs text-text-muted">{group.description}</p></div>{canManage && <div className="flex w-full gap-2 sm:w-auto"><Input value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={300} placeholder="Descrição opcional" className="sm:w-52" /><Button variant="outline" onClick={() => input.current?.click()} disabled={upload.isPending}><ImagePlus className="size-4" />{upload.isPending ? 'Enviando...' : 'Adicionar'}</Button><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={selectFiles} /></div>}</div>
    {photos.length ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{photos.map((photo) => <PhotoCard key={photo.id} photo={photo} onClick={() => onSelect(photo)} />)}</div> : <div className="mt-4 flex min-h-28 items-center justify-center rounded-button border border-dashed border-border bg-muted/30 px-4 text-center text-xs text-text-muted">{group.empty}</div>}
  </section>;
}

function PhotoCard({ photo, onClick }: { photo: ServiceOrderPhotoResponse; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="group overflow-hidden rounded-button border border-border bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="relative aspect-[4/3]"><PhotoContent photo={photo} /></div><div className="min-h-12 bg-card px-3 py-2"><p className="truncate text-xs font-semibold">{photo.caption || photo.originalName}</p><p className="mt-0.5 text-[10px] text-text-muted">{new Date(photo.createdAt).toLocaleString('pt-BR')}</p></div></button>;
}

function PhotoContent({ photo }: { photo: ServiceOrderPhotoResponse }) {
  const blob = useServiceOrderPhotoBlob(photo.id);
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!blob.data) return;
    const next = URL.createObjectURL(blob.data);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob.data]);
  if (!url) return <span className="flex size-full items-center justify-center text-text-muted"><LoaderCircle className="size-5 animate-spin" /></span>;
  return <Image src={url} alt={photo.caption || `Foto ${photo.originalName}`} fill unoptimized sizes="(max-width: 640px) 50vw, 25vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />;
}

function PhotoViewer({ photo, onClose, canManage, serviceOrderId }: { photo: ServiceOrderPhotoResponse | null; onClose: () => void; canManage: boolean; serviceOrderId: string }) {
  const remove = useDeleteServiceOrderPhoto(serviceOrderId);
  function deletePhoto() {
    if (!photo || !window.confirm('Excluir esta foto da ordem de serviço?')) return;
    remove.mutate(photo.id, { onSuccess: () => { toast.success('Foto excluída.'); onClose(); }, onError: (error) => toast.error(extractErrorMessage(error)) });
  }
  return <Dialog open={Boolean(photo)} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-w-4xl overflow-hidden p-0"><DialogHeader className="sr-only"><DialogTitle>Visualização da foto</DialogTitle></DialogHeader>{photo && <><div className="relative aspect-[4/3] max-h-[70vh] bg-slate-950"><PhotoContent photo={photo} /><button onClick={onClose} className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-black/60 text-white" aria-label="Fechar"><X className="size-5" /></button></div><div className="flex items-center justify-between gap-3 p-4"><div><p className="font-semibold">{photo.caption || photo.originalName}</p><p className="text-xs text-text-muted">{new Date(photo.createdAt).toLocaleString('pt-BR')}</p></div>{canManage && <Button variant="ghost" className="text-danger" onClick={deletePhoto} disabled={remove.isPending}><Trash2 className="size-4" />Excluir foto</Button>}</div></>}</DialogContent></Dialog>;
}
