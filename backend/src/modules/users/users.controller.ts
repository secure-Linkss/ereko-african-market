import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto, CreateAddressDto, UpdateAddressDto } from './users.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Profiles')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── Profile ──────────────────────────────────────────────────────────────

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'UserProfile object' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Updated UserProfile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  // ─── Addresses ────────────────────────────────────────────────────────────

  @Get('addresses')
  @ApiOperation({ summary: 'Get all saved addresses for current user' })
  @ApiResponse({ status: 200, description: 'Array of Address objects' })
  async getAddresses(@CurrentUser('id') userId: string) {
    return this.usersService.getAddresses(userId);
  }

  @Post('addresses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new address (max 10)' })
  @ApiResponse({ status: 201, description: 'Created Address' })
  @ApiResponse({ status: 403, description: 'Max addresses reached' })
  async createAddress(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.usersService.createAddress(userId, dto);
  }

  @Put('addresses/:id')
  @ApiOperation({ summary: 'Update an existing address' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Updated Address' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async updateAddress(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(userId, addressId, dto);
  }

  @Delete('addresses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an address' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Address deleted' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async deleteAddress(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) addressId: string,
  ) {
    await this.usersService.deleteAddress(userId, addressId);
  }

  @Patch('addresses/:id/default')
  @ApiOperation({ summary: 'Set an address as the default for its type' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Address set as default' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async setDefaultAddress(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) addressId: string,
  ) {
    return this.usersService.setDefaultAddress(userId, addressId);
  }

  // ─── Saved Cards ──────────────────────────────────────────────────────────

  @Get('cards')
  @ApiOperation({ summary: 'Get saved payment cards for current user' })
  @ApiResponse({ status: 200, description: 'Array of SavedCard objects (masked)' })
  async getSavedCards(@CurrentUser('id') userId: string) {
    return this.usersService.getSavedCards(userId);
  }

  @Delete('cards/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a saved card' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Card deleted' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async deleteSavedCard(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) cardId: string,
  ) {
    await this.usersService.deleteSavedCard(userId, cardId);
  }

  // ─── Loyalty ──────────────────────────────────────────────────────────────

  @Get('loyalty')
  @ApiOperation({ summary: 'Get loyalty account and recent transactions' })
  @ApiResponse({ status: 200, description: 'LoyaltyAccount object with recent transactions' })
  @ApiResponse({ status: 404, description: 'Loyalty account not found' })
  async getLoyaltyAccount(@CurrentUser('id') userId: string) {
    return this.usersService.getLoyaltyAccount(userId);
  }
}
