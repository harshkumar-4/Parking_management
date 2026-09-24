export type ParkingRate = {
  id: string;
  vehicle_type: string;
  rate: number;
  duration_hours: number;
  active: boolean;
};

export type ParkingSession = {
  id: string;
  ticket_number: string;
  public_token: string;
  vehicle_number: string;
  vehicle_type: string;
  driver_name: string;
  driver_phone: string;
  entry_time: string;
  exit_time: string | null;
  duration_minutes: number | null;
  parking_amount: number;
  payment_method: string;
  status: "inside" | "exited";
};
