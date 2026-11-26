import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../../app/providers/AuthContext';
import { api, send } from '../../../services/client';
import type { User } from '../../../types/models';
import { ErrorBox, Success, PageHeader } from '../../../components/ui/common';
import { day } from '../../../utils/format';
export function Profile() {
  const { user, setUser } = useAuth(),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
    const photoInput = useRef<HTMLInputElement>(null);
    const [photoBusy, setPhotoBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await api<{ user: User }>(
        '/auth/profile',
        send('PATCH', { ...d, date_of_birth: d.date_of_birth || null }),
      );
      setUser(result.user);
      setMessage('Profile updated.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function updatePhoto(file: File | null) {
    setError('');
    setMessage('');

    if (file && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    setError('Choose a JPG, PNG, or WebP image.');
    return;
    }

    if (file && file.size > 12 * 1024 * 1024) {
    setError('Choose an image smaller than 12 MB.');
    return;
   }

    setPhotoBusy(true);

    try {
    let profile_image: string | null = null;

    if (file) {
      const bitmap = await createImageBitmap(file);
      const side = Math.min(bitmap.width, bitmap.height, 512);
      const canvas = document.createElement('canvas');
      canvas.width = side;
      canvas.height = side;

      const context = canvas.getContext('2d');
      if (!context) throw new Error('This image could not be processed.');

      context.drawImage(
        bitmap,
        (bitmap.width - side) / 2,
        (bitmap.height - side) / 2,
        side,
        side,
        0,
        0,
        side,
        side,
      );
      bitmap.close();

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (result) =>
            result
              ? resolve(result)
              : reject(new Error('This image could not be processed.')),
          'image/jpeg',
          0.84,
        ),
      );

      profile_image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('This image could not be read.'));
        reader.readAsDataURL(blob);
      });
    }

    const result = await api<{ user: User }>(
      '/auth/profile/photo',
      send('PATCH', { profile_image }),
    );

    setUser(result.user);
    setMessage(file ? 'Profile picture updated.' : 'Profile picture removed.');
  } catch (e) {
    setError((e as Error).message);
  } finally {
    setPhotoBusy(false);
    if (photoInput.current) photoInput.current.value = '';
  }
}
  return (
    <>
      <PageHeader title="Profile" />
      <div className="max-w-[720px] border border-[#c8a783] bg-[#fff8ee] p-[26px] max-[500px]:p-[19px]">
        <ErrorBox message={error} />
        <Success message={message} />
        <section className="mb-6 flex items-center gap-5 border-b border-[#e4cfb5] pb-6">
  {user!.profile_image ? (
    <img
      className="h-24 w-24 shrink-0 rounded-full border border-[#c8a783] object-cover"
      src={user!.profile_image}
      alt="Your profile"
    />
  ) : (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-[#c8a783] bg-[#f3e1c7] font-serif text-3xl text-[#70462c]">
      {user!.first_name.charAt(0).toUpperCase()}
    </div>
  )}

  <div>
    <h2>Profile picture</h2>
    <p>JPG, PNG, or WebP, up to 12 MB.</p>

    <input
      ref={photoInput}
      className="sr-only"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      aria-label="Choose a profile picture"
      onChange={(event) =>
        void updatePhoto(event.currentTarget.files?.[0] ?? null)
      }
    />

    <button
      type="button"
      disabled={photoBusy}
      onClick={() => photoInput.current?.click()}
    >
      {photoBusy ? 'Saving…' : user!.profile_image ? 'Change photo' : 'Add photo'}
    </button>

    {user!.profile_image && (
      <button
        type="button"
        disabled={photoBusy}
        onClick={() => void updatePhoto(null)}
      >
        Remove
      </button>
    )}
  </div>
  </section>
        <form className="grid grid-cols-2 gap-[18px] max-[500px]:grid-cols-1" onSubmit={submit}>
          <label>
            First name
            <input name="first_name" defaultValue={user!.first_name} required maxLength={80} />
          </label>
          <label>
            Last name
            <input name="last_name" defaultValue={user!.last_name} required maxLength={80} />
          </label>
          <label>
            Phone number
            <input
              name="phone_number"
              type="tel"
              defaultValue={user!.phone_number.startsWith('+63') ? user!.phone_number : '+63 '}
              placeholder="+63 917 123 4567"
              pattern="\+63[0-9 ]{9,14}"
              title="Use a Philippine number beginning with +63"
              required
              minLength={12}
              maxLength={18}
            />
          </label>
          <label>
            Date of birth <span className="text-[#806348]">(optional)</span>
            <input type="date" name="date_of_birth" defaultValue={user!.date_of_birth ?? ''} max={day()} />
          </label>
          <label className="col-span-full max-[500px]:col-span-auto">
            Email
            <input value={user!.email} disabled />
          </label>
          <div className="col-span-full max-[500px]:col-span-auto">
            <button disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
          </div>
        </form>
      </div>
    </>
  );
}
