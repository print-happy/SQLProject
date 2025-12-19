package service

import (
	"campus-logistics/internal/repository"
)

type InbounceRequest struct {
    TrackingNumber string `json:"tracking_number" binding:"required"` // 必填
	Phone          string `json:"phone" binding:"required"`           // 必填
	CourierCode    string `json:"courier_code" binding:"required"`    // 必填 (如 SF, YT)
	UserName       string `json:"user_name"`	
}


func Inbounce(req InbounceRequest) error {
	return repository.CreateParcelInbound(req.TrackingNumber, req.Phone, req.CourierCode, req.UserName)
}

type PickupRequest struct {
	TrackingNumber string `json:"tracking_number" binding:"required"`
	PickupCode     string `json:"pickup_code" binding:"required"`
}

func Pickup(req PickupRequest) error{
	return repository.PickupParcel(req.TrackingNumber, req.PickupCode)
}