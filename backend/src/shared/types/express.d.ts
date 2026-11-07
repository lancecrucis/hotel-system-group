declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'customer' | 'staff' | 'admin';
        first_name: string;
        last_name: string;
        email: string;
        phone_number: string;
        date_of_birth: string | null;
      };
    }
  }
}
export {};
