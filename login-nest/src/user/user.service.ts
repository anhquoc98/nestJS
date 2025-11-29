import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entity/user.entity';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entity/refresh-token.entity';
import { AccessToken } from '../entity/access-token.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AccessToken)
    private accessTokenRepository: Repository<AccessToken>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async getUsers() {
    return await this.userRepository.find(); // Sử dụng phương thức find từ Repository
  }

  async findOneByUsername(username: string) {
    return this.userRepository.findOne({ where: { username } });
  }

  async revokeRefreshTokens(userId: number): Promise<void> {
    await this.refreshTokenRepository.update(
      { user: { id: userId }, revoked: false }, // Điều kiện để cập nhật
      { revoked: true }, // Đánh dấu là đã thu hồi
    );
  }

  async findOne(username: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { username } });
  }

  async findOneById(userId: number): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async createUser(username: string, password: string, email: string) {
    const user = this.userRepository.create({ username, password, email });
    await this.userRepository.save(user);
    return user;
  }
}
