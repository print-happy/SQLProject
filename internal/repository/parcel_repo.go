package repository

import (
	"fmt"
	"campus-logistics/internal/model"
)

func CreateParcelInbound(trackingNum, phone, courierCode, userName string) error {
	query:= `CALL sp_parcel_inbound($1, $2, $3, $4)`
	_,err:=DB.Exec(query, trackingNum, phone,courierCode, userName)
	if err!=nil {
        return fmt.Errorf("execute stored procedure failed: %w", err)
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