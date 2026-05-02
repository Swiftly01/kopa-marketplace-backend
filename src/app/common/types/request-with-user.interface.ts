import { Request } from 'express';
import { UserRole } from '../enums/roles-enum';

export interface JwtUser {
  id: string;
  email: string;
  role: UserRole;
}

// export interface RequestWithUser extends Request {
//   user: JwtUser;
// }

export type RequestWithUser<T> = Request & {
  user: T;
};
