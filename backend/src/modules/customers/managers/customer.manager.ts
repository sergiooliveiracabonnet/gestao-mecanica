import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  CreateCustomerRequest,
  CustomerListItemResponse,
  CustomerListRequest,
  CustomerResponse,
  PaginationData,
  UpdateCustomerRequest,
} from '@oficina/contracts';
import type { Customer as CustomerEntity } from '@oficina/database';
import { AppErrorCode } from '../../../shared/errors/app-error-code';
import { AppException } from '../../../shared/errors/app-exception';
import { AuditLogService } from '../../../shared/audit-log/audit-log.service';
import { DocumentValidatorService } from '../../../shared/documents/document-validator.service';
import type { AuthenticatedUser } from '../../../shared/guards/jwt-auth.guard';
import { CustomerRepository } from '../repositories/customer.repository';

@Injectable()
export class CustomerManager {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly documentValidator: DocumentValidatorService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(actingUser: AuthenticatedUser, request: CreateCustomerRequest): Promise<{ customer: CustomerResponse }> {
    const documentCheck = this.documentValidator.validate(request.document);
    if (!documentCheck.valid) {
      throw new AppException(AppErrorCode.VALIDATION_ERROR, 'CPF/CNPJ inválido.');
    }

    const existing = await this.customerRepository.byDocument(documentCheck.normalized);
    if (existing) {
      throw new AppException(
        AppErrorCode.CUSTOMER_DOCUMENT_ALREADY_EXISTS,
        'Já existe um cliente cadastrado com este documento.',
        HttpStatus.CONFLICT,
      );
    }

    const customer = await this.customerRepository.insert({
      tenantId: actingUser.tenantId,
      type: request.type,
      document: documentCheck.normalized,
      name: request.name,
      phone: request.phone,
      email: request.email,
      address: request.address,
      notes: request.notes,
    });

    await this.auditLog.record({
      tenantId: actingUser.tenantId,
      userId: actingUser.userId,
      action: 'customer.created',
      entity: 'customer',
      entityId: customer.id,
      metadata: { document: customer.document },
    });

    return { customer: this.toResponse(customer) };
  }

  async update(actingUser: AuthenticatedUser, request: UpdateCustomerRequest): Promise<{ customer: CustomerResponse }> {
    const existing = await this.customerRepository.byId(request.id);
    if (!existing) {
      throw new AppException(AppErrorCode.CUSTOMER_NOT_FOUND, 'Cliente não encontrado.', HttpStatus.NOT_FOUND);
    }

    // type/document não são editáveis após criação (identidade do cliente)
    // — mesmo que venham no body, o repository só recebe os campos abaixo.
    await this.customerRepository.update(request.id, {
      name: request.name,
      phone: request.phone,
      email: request.email,
      address: request.address,
      notes: request.notes,
    });

    const updated = await this.customerRepository.byId(request.id);
    if (!updated) {
      throw new AppException(AppErrorCode.CUSTOMER_NOT_FOUND, 'Cliente não encontrado.', HttpStatus.NOT_FOUND);
    }

    await this.auditLog.record({
      tenantId: actingUser.tenantId,
      userId: actingUser.userId,
      action: 'customer.updated',
      entity: 'customer',
      entityId: updated.id,
      metadata: {},
    });

    return { customer: this.toResponse(updated) };
  }

  async delete(actingUser: AuthenticatedUser, id: string): Promise<{ customer: CustomerResponse }> {
    const existing = await this.customerRepository.byId(id);
    if (!existing) {
      throw new AppException(AppErrorCode.CUSTOMER_NOT_FOUND, 'Cliente não encontrado.', HttpStatus.NOT_FOUND);
    }

    await this.customerRepository.softDelete(id);

    await this.auditLog.record({
      tenantId: actingUser.tenantId,
      userId: actingUser.userId,
      action: 'customer.deleted',
      entity: 'customer',
      entityId: id,
      metadata: {},
    });

    return { customer: this.toResponse({ ...existing, deletedAt: new Date() }) };
  }

  async getById(id: string): Promise<{ customer: CustomerResponse }> {
    const customer = await this.customerRepository.byId(id);
    if (!customer) {
      throw new AppException(AppErrorCode.CUSTOMER_NOT_FOUND, 'Cliente não encontrado.', HttpStatus.NOT_FOUND);
    }

    return { customer: this.toResponse(customer) };
  }

  async list(request: CustomerListRequest): Promise<PaginationData<CustomerListItemResponse>> {
    const { items, total } = await this.customerRepository.listByTenant(request.offset, request.limit, request.search);

    return {
      items: items.map((customer) => this.toResponse(customer)),
      total,
      offset: request.offset,
      limit: request.limit,
      hasMore: request.offset + items.length < total,
    };
  }

  private toResponse(customer: CustomerEntity): CustomerResponse {
    return {
      id: customer.id,
      tenantId: customer.tenantId,
      type: customer.type as CustomerResponse['type'],
      document: customer.document,
      name: customer.name,
      email: customer.email ?? undefined,
      phone: customer.phone,
      address: (customer.address as CustomerResponse['address']) ?? undefined,
      notes: customer.notes ?? undefined,
      createdAt: customer.createdAt.toISOString(),
    };
  }
}
