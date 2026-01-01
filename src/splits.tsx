import { Center, Group, Select, Slider, Stack, Switch, Table } from '@mantine/core';
import { useEffect, useState } from 'react';

const LAP_DISTANCE = 400;

const distances = {
  500: {
    distance: 500,
    opening: 100,
    laps: 1,
  },
  1000: {
    distance: 1000,
    opening: 200,
    laps: 2,
  },
  1500: {
    distance: 1500,
    opening: 300,
    laps: 3,
  },
  3000: {
    distance: 3000,
    opening: 200,
    laps: 6,
  },
  5000: {
    distance: 5000,
    opening: 200,
    laps: 12,
  },
  10000: {
    distance: 10000,
    opening: 400,
    laps: 24,
  },
} as const;

type Distance = keyof typeof distances;

type DistanceInfo = {
  distance: Distance;
  opening: number;
  laps: number;
};

function getOpeningPct(distance: DistanceInfo) {
  switch (distance.distance) {
    case 500:
      return 0.275;
    case 1000:
      return 0.24;
    case 1500:
      return 0.23;
    case 3000:
      return 0.09;
    case 5000:
      return 0.05;
    case 10000:
      return 0.045;
  }
}

type LockMode = { type: 'none' } | { type: 'lap'; lap: number } | { type: 'opening'; opening: number };

const LockMode = {
  none: { type: 'none' } as LockMode,
  opening: (opening: number): LockMode => ({ type: 'opening', opening }),
  lap: (lap: number): LockMode => ({ type: 'lap', lap }),
};

type Mode = { type: 'result'; result: number } | { type: 'laps'; lap: number; opening: number }; // TODO type opening

function useLockMode() {
  const [lockMode, setLockMode] = useState<LockMode>(LockMode.none);
  const setLapLock = (n: number) =>
    lockMode.type !== 'lap' ? setLockMode(LockMode.lap(n)) : setLockMode(LockMode.none);
  const setOpeningLock = (n: number) =>
    lockMode.type !== 'opening' ? setLockMode(LockMode.opening(n)) : setLockMode(LockMode.none);
  const lapLock = lockMode.type === 'lap';
  const openingLock = lockMode.type === 'opening';

  return { lockMode, lapLock, setLapLock, openingLock, setOpeningLock };
}

function useMode(distance: DistanceInfo, lockMode: LockMode) {
  const [mode, setMode] = useState<Mode>({ type: 'laps', lap: 40, opening: 20 });

  if (mode.type === 'laps') {
    const setOpeningSec = (opening: number) => {
      setMode({ ...mode, opening });
    };
    const setLapSec = (lap: number) => {
      setMode({ ...mode, lap });
    };
    const setResult = (result: number) => {
      setMode({ type: 'result', result });
    };
    return {
      secLap: mode.lap,
      secOpening: mode.opening,
      result: mode.opening + mode.lap * distance.laps,
      setOpeningSec,
      setLapSec,
      setResult,
    };
  }
  // "result" mode
  const calculateLapAndOpeningFromLockMode = () => {
    switch (lockMode.type) {
      case 'opening': {
        const openingPct = lockMode.opening / mode.result;
        const secOpening = openingPct * mode.result;
        const lapPct = (1 - openingPct) / distance.laps;
        const secLap = lapPct * mode.result;
        return { secOpening, secLap };
      }
      case 'lap': {
        const lapPct = (lockMode.lap * distance.laps) / mode.result;
        const secLap = lockMode.lap;
        const openingPct = 1 - lapPct;
        const secOpening = openingPct * mode.result;
        return { secOpening, secLap };
      }
      case 'none': {
        const openingPct = getOpeningPct(distance);
        const secOpening = openingPct * mode.result;
        const lapPct = (1 - openingPct) / distance.laps;
        const secLap = lapPct * mode.result;
        return { secOpening, secLap };
      }
    }
  };
  const { secOpening, secLap } = calculateLapAndOpeningFromLockMode();

  const setOpeningSec = (opening: number) => {
    setMode({ type: 'laps', lap: secLap, opening });
  };
  const setLapSec = (lap: number) => {
    setMode({ type: 'laps', lap, opening: secOpening });
  };
  const setResult = (result: number) => {
    setMode({ ...mode, result });
  };

  return { secLap, secOpening, result: mode.result, setOpeningSec, setLapSec, setResult };
}

export default function Page() {
  const distanceOptions = Object.keys(distances).map(distance => ({
    value: distance,
    label: `${distance}m`,
  }));
  const [selectedDistance, setSelectedDistance] = useState<Distance>(getInitialDistance);

  const distance = distances[selectedDistance];
  const { lockMode, lapLock, setLapLock, openingLock, setOpeningLock } = useLockMode();
  const { secLap, secOpening, result, setOpeningSec, setLapSec, setResult } = useMode(distance, lockMode);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('distance', selectedDistance.toString());
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', next);
  }, [selectedDistance]);

  return (
    <Stack maw={'500px'} w={'100%'} gap={'10px'}>
      <Center>
        <Select
          maw={'150px'}
          label="Distance"
          data={distanceOptions}
          value={selectedDistance.toString()}
          onChange={value => value && setSelectedDistance(parseInt(value, 10) as Distance)}
          allowDeselect={false}
        />
      </Center>
      <Stack mt="30px" gap={'60px'}>
        <OpeningSlider
          distance={distance}
          sec={secOpening}
          setSec={setOpeningSec}
          locked={openingLock}
          onToggleLock={() => setOpeningLock(secOpening)}
        />
        <LapTimeSlider secLap={secLap} setSecLap={setLapSec} locked={lapLock} onToggleLock={() => setLapLock(secLap)} />
        <ResultSlider distance={distance} result={result} setResult={setResult} />
      </Stack>
      <Stack gap={'10px'}>
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

function OpeningSlider(props: {
  distance: DistanceInfo;
  sec: number;
  setSec: (n: number) => void;
  locked: boolean;
  onToggleLock: () => void;
}) {
  return (
    <Group gap="sm" align="center" wrap="nowrap">
      <Slider
        color="blue"
        value={props.sec}
        onChange={value => {
          if (props.locked) {
            props.onToggleLock();
          }
          props.setSec(value);
        }}
        styles={{
          bar: { display: 'none' },
          thumb: props.locked ? { borderColor: 'green' } : undefined,
          mark: {
            backgroundColor: '#fff',
            borderColor: '#fff',
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
        label={val => `Opening: ${formatLap(val)}`}
        style={{ flex: 1 }}
      />
      <LockButton locked={props.locked} onToggle={props.onToggleLock} />
    </Group>
  );
}

function LapTimeSlider(props: {
  secLap: number;
  setSecLap: (n: number) => void;
  locked: boolean;
  onToggleLock: () => void;
}) {
  return (
    <Group gap="sm" align="center" wrap="nowrap">
      <Slider
        color="blue"
        value={props.secLap}
        onChange={value => {
          if (props.locked) {
            props.onToggleLock();
          }
          props.setSecLap(value);
        }}
        styles={{
          bar: { display: 'none' },
          thumb: props.locked ? { borderColor: '#00b800', boxShadow: '0 0 0 2px #7fbf7f' } : undefined,
          mark: {
            backgroundColor: '#fff',
            borderColor: '#fff',
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
        label={val => `Lap: ${formatLap(val)}`}
        style={{ flex: 1 }}
      />
      <LockButton locked={props.locked} onToggle={props.onToggleLock} />
    </Group>
  );
}

function ResultSlider(props: { result: number; setResult: (n: number) => void; distance: DistanceInfo }) {
  return (
    <Group gap="sm" align="center" wrap="nowrap">
      <Slider
        color="blue"
        value={props.result}
        onChange={value => props.setResult(value)}
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
        min={5 * (props.distance.laps + 1)}
        max={60 * (props.distance.laps + 1)}
        label={val => `Result: ${secKmToMinKm(val)}`}
        style={{ flex: 1 }}
      />
    </Group>
  );
}

function LockButton(props: { locked: boolean; onToggle: () => void }) {
  return (
    <div style={{ width: 60, display: 'flex', justifyContent: 'flex-end' }}>
      <Switch
        checked={props.locked}
        onChange={props.onToggle}
        size="sm"
        color={props.locked ? 'green' : 'gray'}
        label={props.locked ? '🔒' : ''}
      />
    </div>
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

function getInitialDistance(): Distance {
  if (typeof window === 'undefined') {
    return 5000;
  }
  const params = new URLSearchParams(window.location.search);
  const param = params.get('distance');
  if (param && Object.prototype.hasOwnProperty.call(distances, param)) {
    return parseInt(param, 10) as Distance;
  }
  return 5000;
}
