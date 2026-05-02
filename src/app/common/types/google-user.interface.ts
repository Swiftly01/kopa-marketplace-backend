export interface GoogleUser {
  provider: 'google';
  providerId: string;
  email?: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  accessToken: string;
  refreshToken: string;
}
