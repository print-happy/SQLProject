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