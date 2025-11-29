import { Repository } from 'typeorm';
import { User } from 'src/entity/user.entity';

export class UserRepository extends Repository<User> {}
