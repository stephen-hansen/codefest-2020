export interface DeviceUsage {
  date: Date;
  amount: number;
}

export interface Device {
  name: string;
  usage: DeviceUsage[];
}

export interface User {
  _id: string;
  username: string;
  password?: string;
  devices: Device[];
}

export interface UserSimple {
  username: string;
  password: string;
}

export interface GroupedUsage {
  name: string;
  usage: DeviceUsage[];
}
