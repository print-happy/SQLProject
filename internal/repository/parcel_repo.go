package repository

import (
	"fmt"
	"campus-logistics/internal/model"
)

func CreateParcelInbound(trackingNum, phone, courierCode, userName string) error {
	tx, err := DB.Beginx()
	if err != nil {
		return fmt.Errorf("transaction begin failed: %w", err)
	}
	defer tx.Rollback()
	query := `CALL sp_parcel_inbound($1, $2, $3, $4)`
	_, err = tx.Exec(query, trackingNum, phone, courierCode, userName)
	if err != nil {
		return fmt.Errorf("stored procedure error: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("transaction commit failed: %w", err)
	}
	return nil
}

func GetParcelByTracking(trackingNum string)(*model.Parcel, error) {
	var p model.Parcel
	query :=`SELECT * FROM parcels WHERE tracking_num = $1`
	err :=DB.Get(&p, query, trackingNum)
	if err!= nil{
		return nil, err
	}
	return &p, nil
}

func GetParcelByPhone(phone string)([]model.ParcelViewStudent, error) {
    parcels := []model.ParcelViewStudent{}
    query := `
        SELECT 
            p.tracking_number, 
            c.name AS courier_name, 
            p.pickup_code, 
            s.zone AS shelf_zone, 
            p.status, 
            p.updated_at 
        FROM parcels p
        LEFT JOIN couriers c ON p.courier_id = c.id
        LEFT JOIN shelves s ON p.shelf_id = s.id
        WHERE p.recipient_phone_snapshot = $1
        ORDER BY p.updated_at DESC
    `
    err := DB.Select(&parcels, query, phone)
    return parcels, err
}

func PickupParcel(trackingNum, pickupCode string) error{
	//使用源自更新语句，避免并发冲突
	query := `UPDATE parcels
	          SET status = 'picked_up', updated_at=NOW()
			  WHERE tracking_number=$1
			  AND pickup_code=$2
			  AND status='stored'
			  `
	
	result, err:=DB.Exec(query, trackingNum, pickupCode)
	if err!=nil {
	return fmt.Errorf("db execution failed:%w",err)
	}

	rowsAffected, err :=result.RowsAffected()
	if err!=nil{
		return err
	}

	if rowsAffected==0{
		return fmt.Errorf("Pickup failed: invalid code or parcel status")
	}

	return nil
}