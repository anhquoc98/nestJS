import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from '../dto/login.dto';
import { AccessToken } from 'src/entity/access-token.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from 'src/entity/refresh-token.entity';
import { Repository } from 'typeorm';
import { RegisterDto } from 'src/dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
    @InjectRepository(AccessToken)
    private accessTokenRepository: Repository<AccessToken>,

    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  // Hàm đăng nhập
  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    // Tìm người dùng theo username
    const user = await this.usersService.findOne(username);
    console.log(user);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Tạo Access Token
    const accessToken = await this.createAccessToken(user);

    // Tạo Refresh Token
    const refreshToken = await this.createRefreshToken(user);

    // Lưu Access Token vào DB
    await this.accessTokenRepository.save({
      token: accessToken,
      user: user,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // Access token expires in 15 minutes
    });

    // Lưu Refresh Token vào DB
    await this.refreshTokenRepository.save({
      token: refreshToken,
      user: user,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Refresh token expires in 7 days
    });

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  // Hàm tạo Access Token
  private async createAccessToken(user: any) {
    const payload = { sub: user.id, username: user.username };
    return this.jwtService.sign(payload, { expiresIn: '15m' }); // Access Token có thời gian hết hạn là 15 phút
  }

  // Hàm tạo Refresh Token
  private async createRefreshToken(user: any) {
    const payload = { sub: user.id };
    return this.jwtService.sign(payload, { expiresIn: '7d' }); // Refresh Token có thời gian hết hạn là 7 ngày
  }

  // Hàm đăng ký
  async register(registerDto: RegisterDto) {
    const { username, password, email } = registerDto;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersService.createUser(
      username,
      hashedPassword,
      email,
    );
    return user;
  }

  // Hàm thu hồi Refresh Token
  async revokeAndRefreshToken(
    userId: number,
  ): Promise<{ access_token: string; refresh_token: string }> {
    // Thu hồi Refresh Token cũ
    await this.usersService.revokeRefreshTokens(userId);

    // Lấy thông tin người dùng
    const user = await this.usersService.findOneById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Tạo mới Access Token và Refresh Token
    const accessToken = this.jwtService.sign(
      { sub: user.id, username: user.username },
      { expiresIn: '15m' },
    );
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      { expiresIn: '7d' },
    );

    // Lưu Refresh Token mới vào DB
    await this.refreshTokenRepository.save({
      token: refreshToken,
      user: user,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Refresh token expires in 7 days
    });

    // Lưu Access Token mới vào DB
    await this.accessTokenRepository.save({
      token: accessToken,
      user: user,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // Access token expires in 15 mins
    });

    return { access_token: accessToken, refresh_token: refreshToken };
  }
  // Hàm đăng xuất
  async logout(refreshToken: string): Promise<void> {
    // Tìm refresh token trong DB
    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });

    // Nếu không tìm thấy hoặc token đã bị thu hồi
    if (!tokenEntity || tokenEntity.revoked) {
      throw new UnauthorizedException('Token invalid or already revoked');
    }

    // Đánh dấu token là revoked
    tokenEntity.revoked = true;
    await this.refreshTokenRepository.save(tokenEntity);
  }
}
