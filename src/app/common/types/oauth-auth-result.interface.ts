import { OAuthAccount } from '../../domain/users/entities/oauth-account.entity';
import { User } from '../../domain/users/entities/user.entity';

export interface OauthAuthResult {
  user: User;
  oauthAccount: OAuthAccount;
  isNewUser: boolean;
}
