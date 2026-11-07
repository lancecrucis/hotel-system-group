import { useAuth } from '../../../app/providers/AuthContext';
export function ContactFields() {
  const { user } = useAuth();
  return (
    <>
      <label className="full">
        Contact name
        <input
          name="contact_name"
          defaultValue={user ? `${user.first_name} ${user.last_name}` : ''}
          required
          minLength={2}
          maxLength={160}
        />
      </label>
      <label>
        Email
        <input name="contact_email" type="email" defaultValue={user?.email} required maxLength={254} />
      </label>
      <label>
        Phone number
        <input
          name="contact_phone"
          type="tel"
          defaultValue={user?.phone_number}
          required
          minLength={7}
          maxLength={30}
        />
      </label>
      <label className="full">
        Special requests <span className="muted">(optional)</span>
        <textarea name="special_requests" maxLength={2000} rows={3} placeholder="Requests" />
      </label>
    </>
  );
}
