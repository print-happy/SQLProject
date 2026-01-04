package repository

import "fmt"

// InsertExpiredAuditLogs writes an immutable audit log record for parcels that are older than expiryDays
// and still in stored/pending state. This does NOT change parcel_status (no DB schema changes).
//
// Idempotency: it will not insert duplicates for the same parcel if an EXPIRED log already exists.
func InsertExpiredAuditLogs(expiryDays int) (int64, error) {
	if expiryDays <= 0 {
		expiryDays = 3
	}

	query := `
		INSERT INTO parcel_audit_logs (parcel_id, action, old_status, new_status, operator)
		SELECT p.id, 'EXPIRED', p.status, p.status, 'SYSTEM'
		FROM parcels p
		WHERE p.status IN ('stored', 'pending')
		  AND p.created_at < NOW() - ($1 * INTERVAL '1 day')
		  AND NOT EXISTS (
			SELECT 1
			FROM parcel_audit_logs l
			WHERE l.parcel_id = p.id AND l.action = 'EXPIRED'
		  )
	`

	result, err := DB.Exec(query, expiryDays)
	if err != nil {
		return 0, fmt.Errorf("insert expired audit logs failed: %w", err)
	}

	n, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}
	return n, nil
}
