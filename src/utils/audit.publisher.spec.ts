import { AuditPublisher } from './audit.publisher';

describe('AuditPublisher', () => {
  it('emits an idempotency key and preserves the existing audit event format', () => {
    const emit = jest.fn();
    const publisher = new AuditPublisher({ emit } as never);
    publisher.log({
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: 'user-1',
      performedBy: 'admin-1',
      municipalityId: 'funes',
      correlationId: 'correlation-1',
      ipAddress: '127.0.0.1',
      metadata: { field: 'name' },
    });

    expect(emit).toHaveBeenCalledWith('audit.log', expect.objectContaining({
      eventId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      service: expect.any(String),
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: 'user-1',
      performedBy: 'admin-1',
      municipalityId: 'funes',
      correlationId: 'correlation-1',
      ipAddress: '127.0.0.1',
      metadata: { field: 'name' },
      level: 'INFO',
      timestamp: expect.any(String),
    }));
  });
});