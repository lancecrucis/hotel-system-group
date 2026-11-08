import { useAuth } from '../../../app/providers/AuthContext';

export type ContactDetails = {
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  special_requests: string;
};

function phone(value = '') {
  return value.startsWith('+63') ? value : '+63 ';
}

export function ContactFields({ value, onChange }: { value?: ContactDetails; onChange?: (value: ContactDetails) => void } = {}) {
  const { user } = useAuth();
  const update = (field: keyof ContactDetails, next: string) => value && onChange?.({ ...value, [field]: next });
  return (
    <>
      <label className="full">
        Contact name
        <input
          name="contact_name"
          {...(value ? { value: value.contact_name, onChange: (event) => update('contact_name', event.target.value) } : { defaultValue: user ? `${user.first_name} ${user.last_name}` : '' })}
          required
          minLength={2}
          maxLength={160}
        />
      </label>
      <label>
        Email
        <input name="contact_email" type="email" {...(value ? { value: value.contact_email, onChange: (event) => update('contact_email', event.target.value) } : { defaultValue: user?.email })} required maxLength={254} />
      </label>
      <label>
        Phone number
        <input
          name="contact_phone"
          type="tel"
          {...(value ? { value: value.contact_phone, onChange: (event) => update('contact_phone', event.target.value) } : { defaultValue: phone(user?.phone_number) })}
          placeholder="+63 917 123 4567"
          pattern="\+63[0-9 ]{9,14}"
          title="Use a Philippine number beginning with +63"
          required
          minLength={12}
          maxLength={18}
          autoComplete="tel"
        />
      </label>
      <label className="full">
        Special requests <span className="muted">(optional)</span>
        <textarea name="special_requests" {...(value ? { value: value.special_requests, onChange: (event) => update('special_requests', event.target.value) } : {})} maxLength={2000} rows={3} placeholder="Requests" />
      </label>
    </>
  );
}
