import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entity/user.entity';
import { AccessToken } from '../entity/access-token.entity';
import { RefreshToken } from '../entity/refresh-token.entity'; // Đảm bảo đường dẫn đúng

@Module({
  imports: [TypeOrmModule.forFeature([User, AccessToken, RefreshToken])], // Đảm bảo rằng User được cung cấp cho Repository
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService], // Export UserService nếu cần thiết cho các module khác
})
export class UserModule {}
