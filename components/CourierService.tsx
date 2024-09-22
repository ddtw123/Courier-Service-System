'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"


interface CourierServiceData {
  baseDeliveryCost: string;
  totalVehicles: string;
  maxSpeed: string;
  maxWeight: string;
}

interface PackageInfo {
  id: string;
  weight: number;
  distance: number;
  offer: string;
}

interface PackageSummary extends PackageInfo {
  discount: number;
  totalCost: number;
}

interface DeliveryPackage extends PackageSummary {
  estimatedDeliveryTime: number;
  trip: number;
}

interface VehicleDelivery {
  vehicleId: number;
  packages: DeliveryPackage[];
  totalWeight: number;
  estimatedReturnTime: number;
  totalDeliveryTime: number;
  trips: number;
  tripTimes: number[];
}

const CourierServiceSystem: React.FC = () => {
  const [formData, setFormData] = useState<CourierServiceData>({
    baseDeliveryCost: '',
    totalVehicles: '',
    maxSpeed: '',
    maxWeight: '',
  });

  const [submitted, setSubmitted] = useState<boolean>(false);
  const [packageInfo, setPackageInfo] = useState<PackageInfo>({
    id: '',
    weight: 0,
    distance: 0,
    offer: '',
  });

  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [packageSummaries, setPackageSummaries] = useState<PackageSummary[]>([]);
  const [vehicleDeliveries, setVehicleDeliveries] = useState<VehicleDelivery[]>([]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [id]: value,
    }));
  };

  const handlePackageChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
  
    setPackageInfo(prevInfo => ({
      ...prevInfo,
      [id]: id === 'weight' || id === 'distance' ? Number(value) : value,
    }));
  };

  const handleOfferChange = (value: string) => {
    setPackageInfo(prevInfo => ({
      ...prevInfo,
      offer: value === 'NONE' ? '' : value,
    }));
  };

  const addPackage = () => {
    // Check if all necessary package fields are filled
    if (packageInfo.id && packageInfo.weight && packageInfo.distance) {
      setPackages(prevPackages => [...prevPackages, { ...packageInfo }]);
      setPackageInfo({ id: '', weight: 0, distance: 0, offer: '' });
    }
  };

  const getEligibleOffers = (weight: number, distance: number): string[] => {
    const offers = [];
    if (distance < 200 && weight >= 70 && weight <= 200) offers.push('OFR001');
    if (distance >= 50 && distance <= 150 && weight >= 100 && weight <= 250) offers.push('OFR002');
    if (distance >= 50 && distance <= 250 && weight >= 10 && weight <= 150) offers.push('OFR003');
    return offers;
  };

  const calculatePackageSummary = (pkg: PackageInfo): PackageSummary => {
    const baseDeliveryCost = Number(formData.baseDeliveryCost);
    const weight = Number(pkg.weight);
    const distance = Number(pkg.distance);
    const rawCost = baseDeliveryCost + weight * 10 + distance * 5;
    let discountPercentage = 0;

    switch (pkg.offer) {
      case 'OFR001':
        if (distance < 200 && weight >= 70 && weight <= 200) {
          discountPercentage = 10;
        }
        break;
      case 'OFR002':
        if (distance >= 50 && distance <= 150 && weight >= 100 && weight <= 250) {
          discountPercentage = 7;
        }
        break;
      case 'OFR003':
        if (distance >= 50 && distance <= 250 && weight >= 10 && weight <= 150) {
          discountPercentage = 5;
        }
        break;
    }

    const discount = (rawCost * discountPercentage) / 100;
    const totalCost = rawCost - discount;

    return {
      ...pkg,
      discount: Number(discount.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
    };
  };

  const allocatePackagesToVehicles = (summaries: PackageSummary[]): VehicleDelivery[] => {
    const maxWeight = Number(formData.maxWeight);
    const totalVehicles = Number(formData.totalVehicles);
    const maxSpeed = Number(formData.maxSpeed);

    const sortedPackages = summaries
      .map(pkg => ({
        ...pkg,
        weight: Number(pkg.weight),
        distance: Number(pkg.distance),
      }))
      .sort((a, b) => b.weight - a.weight || b.distance - a.distance);

    const vehicles: VehicleDelivery[] = Array.from({ length: totalVehicles }, (_, i) => ({
      vehicleId: i + 1,
      packages: [],
      totalWeight: 0,
      estimatedReturnTime: 0,
      totalDeliveryTime: 0,
      trips: 1,
      tripTimes: [0]
    }));

    const allocatePackage = (pkg: PackageSummary) => {
      let allocatedVehicle = vehicles
        .filter(v => v.totalWeight + pkg.weight <= maxWeight)
        .sort((a, b) => a.estimatedReturnTime - b.estimatedReturnTime)[0];

      if (!allocatedVehicle) {
        allocatedVehicle = vehicles.sort((a, b) => a.estimatedReturnTime - b.estimatedReturnTime)[0];
        allocatedVehicle.totalWeight = 0;
        allocatedVehicle.trips += 1;
        allocatedVehicle.tripTimes.push(0);
      }

      const deliveryTime = pkg.distance / maxSpeed;
      const estimatedDeliveryTime = allocatedVehicle.estimatedReturnTime + deliveryTime;

      allocatedVehicle.packages.push({
        ...pkg,
        estimatedDeliveryTime: Number(estimatedDeliveryTime.toFixed(2)),
        trip: allocatedVehicle.trips
      });
      allocatedVehicle.totalWeight += pkg.weight;
      allocatedVehicle.estimatedReturnTime = estimatedDeliveryTime;
      allocatedVehicle.totalDeliveryTime = allocatedVehicle.estimatedReturnTime;
      allocatedVehicle.tripTimes[allocatedVehicle.trips - 1] += deliveryTime;
    };

    sortedPackages.forEach(allocatePackage);

    vehicles.forEach(vehicle => {
      let cumulativeTime = 0;
      vehicle.packages = vehicle.packages.map(pkg => {
        cumulativeTime += pkg.distance / maxSpeed;
        return { ...pkg, estimatedDeliveryTime: Number(cumulativeTime.toFixed(2)) };
      });
      vehicle.tripTimes = vehicle.tripTimes.filter(time => time > 0);
      vehicle.trips = vehicle.tripTimes.length;
      vehicle.totalDeliveryTime = vehicle.tripTimes.reduce((sum, time) => sum + time, 0);
    });
    return vehicles.filter(v => v.packages.length > 0).sort((a, b) => a.vehicleId - b.vehicleId);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const summaries = packages.map(pkg => calculatePackageSummary(pkg));
    setPackageSummaries(summaries);
    const deliveries = allocatePackagesToVehicles(summaries);
    setVehicleDeliveries(deliveries);
    setSubmitted(true);
  };

  const eligibleOffers = getEligibleOffers(Number(packageInfo.weight), Number(packageInfo.distance));

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Courier Service System</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="baseDeliveryCost" className="block text-sm font-medium mb-1">
                  Base Delivery Cost ($)
                </label>
                <Input
                  type="number"
                  id="baseDeliveryCost"
                  value={formData.baseDeliveryCost}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="totalVehicles" className="block text-sm font-medium mb-1">
                  Total Vehicles
                </label>
                <Input
                  type="number"
                  id="totalVehicles"
                  value={formData.totalVehicles}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="maxSpeed" className="block text-sm font-medium mb-1">
                  Maximum Vehicle Speed (km/h)
                </label>
                <Input
                  type="number"
                  id="maxSpeed"
                  value={formData.maxSpeed}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="maxWeight" className="block text-sm font-medium mb-1">
                  Maximum Package Weight (kg)
                </label>
                <Input
                  type="number"
                  id="maxWeight"
                  value={formData.maxWeight}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2">Add Package</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="id" className="block text-sm font-medium mb-1">Package ID</label>
                  <Input
                    type="text"
                    id="id"
                    value={packageInfo.id}
                    onChange={handlePackageChange}
                  />
                </div>
                <div>
                  <label htmlFor="weight" className="block text-sm font-medium mb-1">Package Weight (kg)</label>
                  <Input
                    type="number"
                    id="weight"
                    value={packageInfo.weight}
                    onChange={handlePackageChange}
                  />
                </div>
                <div>
                  <label htmlFor="distance" className="block text-sm font-medium mb-1">Delivery Distance (km)</label>
                  <Input
                    type="number"
                    id="distance"
                    value={packageInfo.distance}
                    onChange={handlePackageChange}
                  />
                </div>
                <div>
                  <label htmlFor="offer" className="block text-sm font-medium mb-1">Offer Code</label>
                  <Select 
                    value={packageInfo.offer || 'NONE'} 
                    onValueChange={handleOfferChange}
                  >
                    <SelectTrigger id="offer">
                      <SelectValue placeholder="Select an offer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      {eligibleOffers.map(offer => (
                        <SelectItem key={offer} value={offer}>{offer}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                type="button"
                onClick={addPackage}
                className="mt-4"
              >
                Add Package
              </Button>
            </div>

            {packages.length > 0 && (
              <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2">Packages Added</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package ID</TableHead>
                    <TableHead>Weight (kg)</TableHead>
                    <TableHead>Distance (km)</TableHead>
                    <TableHead>Offer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map(pkg => (
                    <TableRow key={pkg.id}>
                      <TableCell>{pkg.id}</TableCell>
                      <TableCell>{pkg.weight}</TableCell>
                      <TableCell>{pkg.distance}</TableCell>
                      <TableCell>{pkg.offer || 'None'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

            <Button
              type="submit"
              className="mt-8"
            >
              Calculate Estimated Time for Delivery
            </Button>
          </form>

          {submitted && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2">Vehicle Delivery Details</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Total Time (hours)</TableHead>
                    <TableHead>Trips</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleDeliveries.map(vehicle => (
                    <TableRow key={vehicle.vehicleId}>
                      <TableCell>Vehicle {vehicle.vehicleId}</TableCell>
                      <TableCell>{vehicle.totalDeliveryTime.toFixed(2)}</TableCell>
                      <TableCell>{vehicle.trips}</TableCell>
                      <TableCell>
                        {vehicle.tripTimes.map((tripTime, tripIndex) => {
                          const tripNumber = tripIndex + 1;
                          const tripPackages = vehicle.packages.filter(pkg => pkg.trip === tripNumber);
                          return (
                            <div key={tripNumber} className="mb-2">
                              <p className="font-semibold">Trip {tripNumber} - Time: {tripTime.toFixed(2)} hours</p>
                              <ul className="list-disc pl-5">
                                {tripPackages.map(pkg => {
                                  const estimatedDeliveryTime = pkg.distance / Number(formData.maxSpeed);
                                  return (
                                    <li key={pkg.id}>
                                      Package {pkg.id}: Time: {estimatedDeliveryTime.toFixed(2)} hours,
                                      Cost: ${pkg.totalCost.toFixed(2)} (Discount: ${pkg.discount.toFixed(2)})
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          );
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CourierServiceSystem;