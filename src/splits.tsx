import { Center, Select, Slider, Stack, Table, Text, Title } from '@mantine/core';
import { useState } from 'react';

const LAP_DISTANCE = 400;

const distances = {
  500: {
    opening: 100,
    laps: 1,
  },
  1000: {
    opening: 200,
    laps: 2,
  },
  1500: {
    opening: 300,
    laps: 3,
  },
  3000: {
    opening: 200,
    laps: 6,
  },
  5000: {
    opening: 200,
    laps: 12,
  },
  10000: {
    opening: 400,
    laps: 24,
  },
} as const;

type DistanceInfo = {
  opening: number;
  laps: number;
};

export default function Page() {
  const distanceOptions = Object.keys(distances).map(distance => ({
    value: distance,
    label: `${distance}m`,
  }));
  const [secLap, setLapSec] = useState(40);
  const [secOpening, setOpeningSec] = useState(20);
  const [selectedDistance, setSelectedDistance] = useState('5000');

  const distance = distances[Number(selectedDistance) as keyof typeof distances];

  const totalTime = secOpening + secLap * distance.laps;

  return (
    <Stack maw={'500px'} w={'100%'} gap={'40px'}>
      <Center>
        <Select
          maw={'150px'}
          label="Distance"
          data={distanceOptions}
          value={selectedDistance}
          onChange={value => value && setSelectedDistance(value)}
          allowDeselect={false}
        />
      </Center>
      <Stack gap={'60px'}>
        <LapTimeSlider secLap={secOpening} setSecLap={setOpeningSec} labelPrefix="Opening" />
        <LapTimeSlider secLap={secLap} setSecLap={setLapSec} labelPrefix="Lap" />
      </Stack>
      <Stack gap={'10px'}>
        <Center>
          <Text>Result: {secKmToMinKm(totalTime)}</Text>
        </Center>

        <Center>
          <Splits secLap={secLap} secOpening={secOpening} distance={distance} />
        </Center>
      </Stack>
    </Stack>
  );
}

function Splits(props: { secOpening: number; secLap: number; distance: DistanceInfo }) {
  const { secOpening, secLap, distance } = props;

  const laps = lapSplits(secOpening, secLap, distance);

  return (
    <Table striped highlightOnHover withColumnBorders>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Lap</Table.Th>
          <Table.Th>Distance</Table.Th>
          <Table.Th>Time</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {laps.map(lap => (
          <Table.Tr key={lap.lapNumber}>
            <Table.Td>{lap.lapNumber}</Table.Td>
            <Table.Td>{formatDistance(lap.distance)}</Table.Td>
            <Table.Td>{formatSplitTime(lap.timeSec)}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function LapTimeSlider(props: { secLap: number; setSecLap: (n: number) => void; labelPrefix: string }) {
  return (
    <Slider
      color="blue"
      value={props.secLap}
      onChange={props.setSecLap}
      styles={{
        bar: { display: 'none' },
        mark: {
          backgroundColor: '#fff',
          borderColor: '#fff',
          '&[data-filled]': { backgroundColor: '#fff', borderColor: '#fff' },
        },
      }}
      step={0.1}
      size={'md'}
      labelAlwaysOn
      min={5}
      max={60}
      marks={[10, 20, 30, 40, 50, 60].map(secs => ({
        value: secs,
        label: secs,
      }))}
      label={val => `${props.labelPrefix}: ${formatLap(val)}`}
    />
  );
}

function secKmToMinKm(secKm: number): string {
  const mins = Math.floor(secKm / 60);
  const secs = secKm % 60;
  const paddedSecs = secs.toFixed(1).padStart(4, '0');
  return `${mins}:${paddedSecs}`;
}

function formatLap(lap: number): string {
  const fixed = lap.toFixed(1);
  return fixed.includes('.') ? fixed : fixed + '.0';
}

function formatLapNumber(lapNumber: number): string {
  return `${lapNumber.toString().padStart(2, '0')}.`;
}

function formatDistance(distance: number): string {
  return `${distance.toString().padStart(5, ' ')}m`;
}

function formatSplitTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const paddedSecs = secs.toFixed(1).padStart(4, '0');
  return `${mins.toString().padStart(2, '0')}:${paddedSecs}`;
}

type LapInfo = {
  distance: number;
  timeSec: number;
  lapNumber: number;
};

function lapSplits(secOpening: number, secLap: number, distance: DistanceInfo): Array<LapInfo> {
  const laps: Array<LapInfo> = [];
  let curDistance = distance.opening;
  let curTime = secOpening;
  for (let i = 0; i < distance.laps + 1; i++) {
    const info = { distance: curDistance, timeSec: curTime, lapNumber: i + 1 };
    laps.push(info);
    curDistance += LAP_DISTANCE;
    curTime += secLap;
  }
  return laps;
}
