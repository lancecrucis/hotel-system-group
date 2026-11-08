import { useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { useQuery } from '../../../hooks/useQuery';
import { api, send } from '../../../services/client';
import type { Room } from '../../../types/models';
import { PageHeader, ErrorBox, Success, Loading, Badge, Modal } from '../../../components/ui/common';
import { money } from '../../../utils/format';
export function ManageRooms() {
  const query = useQuery<{ rooms: Room[] }>('/hotel/rooms'),
    [editing, setEditing] = useState<Room | 'new' | null>(null),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const room = editing && editing !== 'new' ? editing : null;
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget),
      data: Record<string, unknown> = Object.fromEntries(form);
    for (const k of ['capacity', 'bed_count', 'price_per_night']) data[k] = Number(data[k]);
    data.has_wifi = form.has('has_wifi');
    data.breakfast_included = form.has('breakfast_included');
    data.images = String(data.images ?? '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    setBusy(true);
    setError('');
    try {
      await api(`/hotel/rooms${room ? `/${room.id}` : ''}`, send(room ? 'PATCH' : 'POST', data));
      setEditing(null);
      setMessage('Room saved.');
      query.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Room inventory"
        action={
          <button
            onClick={() => {
              setEditing('new');
              setError('');
            }}
          >
            <Plus size={17} />
            Add room
          </button>
        }
      />
      <ErrorBox message={query.error} />
      <Success message={message} />
      <div className="panel flush">
        {query.loading ? (
          <Loading />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Rate / night</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.rooms.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.room_number}</strong>
                    </td>
                    <td>
                      {r.room_type}
                      <small>
                        {r.bed_count} {r.bed_type}
                      </small>
                    </td>
                    <td>{r.capacity} guests</td>
                    <td>{money(r.price_per_night)}</td>
                    <td>
                      <Badge status={r.status} />
                    </td>
                    <td>
                      <button
                        className="secondary small"
                        onClick={() => {
                          setEditing(r);
                          setError('');
                        }}
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && (
        <Modal
          title={room ? `Edit room ${room.room_number}` : 'Add a room'}
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <ErrorBox message={error} />
          <form className="form-grid" onSubmit={save}>
            <label>
              Room number
              <input name="room_number" defaultValue={room?.room_number} required maxLength={20} />
            </label>
            <label>
              Room type
              <input
                name="room_type"
                defaultValue={room?.room_type}
                required
                maxLength={80}
                placeholder="Deluxe King"
              />
            </label>
            <label>
              Nightly rate (PHP)
              <input
                name="price_per_night"
                type="number"
                min="0.01"
                max={1000000}
                step="0.01"
                defaultValue={room?.price_per_night}
                required
              />
            </label>
            <label>
              Guest capacity
              <input
                name="capacity"
                type="number"
                min={1}
                max={20}
                defaultValue={room?.capacity ?? 2}
                required
              />
            </label>
            <label>
              Bed type
              <input name="bed_type" defaultValue={room?.bed_type ?? 'Queen'} required maxLength={80} />
            </label>
            <label>
              Number of beds
              <input
                name="bed_count"
                type="number"
                min={1}
                max={10}
                defaultValue={room?.bed_count ?? 1}
                required
              />
            </label>
            <label className="full">
              Status
              <select name="status" defaultValue={room?.status ?? 'available'}>
                <option value="available">Available for booking</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="full">
              Description
              <textarea name="description" defaultValue={room?.description ?? ''} maxLength={2000} />
            </label>
            <label className="full">
              Amenities
              <input
                name="special_amenities"
                defaultValue={room?.special_amenities ?? ''}
                maxLength={1000}
                placeholder="Balcony, coffee maker"
              />
            </label>
            <label className="checkbox">
              <input name="has_wifi" type="checkbox" defaultChecked={room?.has_wifi ?? true} />
              Wi-Fi included
            </label>
            <label className="checkbox">
              <input
                name="breakfast_included"
                type="checkbox"
                defaultChecked={room?.breakfast_included ?? false}
              />
              Breakfast included
            </label>
            <label className="full">
              Cover image URL <span className="muted">(optional)</span>
              <input
                name="image_url"
                type="url"
                defaultValue={room?.image_url ?? ''}
                placeholder="https://…"
              />
            </label>
            <label className="full">
              Gallery image URLs <span className="muted">(one per line, up to 8)</span>
              <textarea
                name="images"
                defaultValue={room?.images.map((i) => i.image_url).join('\n') ?? ''}
                rows={3}
              />
            </label>
            <div className="full">
              <button disabled={busy}>{busy ? 'Saving…' : 'Save room'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
