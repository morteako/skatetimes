import { ActionIcon, Button, Center, Group, Select, Slider, Stack, Table } from '@mantine/core';
import { useEffect, useState } from 'react';

type LapProg = { startLap: number; diff: number };

export default function Page() {
  const distanceOptions = Object.keys(distances).map(distance => ({
    value: distance,
    label: `${distance}m`,
  }));
  const [selectedDistance, setSelectedDistance] = useState<Distance>(getInitialDistance);

  const distance = distances[selectedDistance];
  const [lapProg, setLapProg] = useState<LapProg | null>(null);

  const lapProgFunc = makeLapProgFunc(lapProg);
  // const { lockMode, lapLock, setLapLock, openingLock, setOpeningLock } = useLockMode();
  const lockMode = LockMode.none;
  const { secLap, secOpening, result, setOpeningSec, setLapSec, setResult } = useMode(distance, lockMode, lapProgFunc);

  const { minResult, maxResult } = calculateMinMaxResult(lockMode, distance);
  const [showSplits, setShowSplits] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('distance', selectedDistance.toString());
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', next);
  }, [selectedDistance]);

  return (
    <Stack maw={'500px'} w={'100%'} gap={'30px'}>
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
      <Stack mt="10px" gap={'30px'}>
        <ResultSlider
          distance={distance}
          result={result}
          setResult={(result: number) => {
            setLapProg(lapProg === null ? null : { ...lapProg, diff: 0 });
            setResult(result);
          }}
          minResult={minResult}
          maxResult={maxResult}
        />
        <OpeningSlider distance={distance} sec={secOpening} setSec={setOpeningSec} />
        <LapTimeSlider secLap={secLap} setSecLap={setLapSec} />
      </Stack>
      <Stack>
        <Center>
          <LapProgression lapProg={lapProg} setLapProg={setLapProg} maxLap={distance.laps} />
        </Center>
        <Center>
          {lapProg ? (
            <Button variant="subtle" onClick={() => setLapProg(null)}>
              Remove lap progression
            </Button>
          ) : (
            <Button variant="subtle" onClick={() => setLapProg({ startLap: 2, diff: 0.1 })}>
              Add lap progression
            </Button>
          )}
        </Center>
      </Stack>

      <Stack gap={'10px'}>
        <Center>
          <Button variant="subtle" onClick={() => setShowSplits(value => !value)}>
            {showSplits ? 'Hide splits' : 'Show splits'}
          </Button>
        </Center>
        {showSplits && (
          <Center>
            <Splits secLap={secLap} secOpening={secOpening} distance={distance} lapProg={lapProgFunc} />
          </Center>
        )}
      </Stack>
    </Stack>
  );
}

const makeLapProgFunc = (lapProg: LapProg | null) => {
  if (!lapProg) {
    return (params: { curLap: number; lapNumber: number }) => params.curLap;
  }
  return (params: { curLap: number; lapNumber: number }) => {
    if (params.lapNumber < lapProg.startLap) {
      return params.curLap;
    }
    return Math.max(0, params.curLap + lapProg.diff);
  };
};

function LapProgression(props: {
  lapProg: LapProg | null;
  setLapProg: React.Dispatch<React.SetStateAction<LapProg | null>>;
  maxLap: number;
}) {
  if (!props.lapProg) {
    return null;
  }

  const prog = props.lapProg;

  return (
    <Stack gap={'25px'} w="100%">
      <Center w="100%">
        <Group w="100%" maw="60%" gap="xs" wrap="nowrap">
          <ActionIcon
            size="xs"
            variant="light"
            onClick={() =>
              props.setLapProg(item =>
                item ? { ...item, startLap: adjustValue(item.startLap, -1, 1, 2, props.maxLap) } : item
              )
            }
          >
            –
          </ActionIcon>
          <Slider
            size="xs"
            w="100%"
            min={2}
            max={props.maxLap}
            step={1}
            value={prog.startLap}
            marks={[
              { value: 2, label: '2' },
              { value: props.maxLap, label: props.maxLap.toString() },
            ]}
            label={value => `Start lap: ${value}`}
            labelAlwaysOn
            mt={15}
            mb={15}
            onChange={value => props.setLapProg(item => (item ? { ...item, startLap: value } : item))}
          />
          <ActionIcon
            size="xs"
            variant="light"
            onClick={() =>
              props.setLapProg(item =>
                item ? { ...item, startLap: adjustValue(item.startLap, 1, 1, 2, props.maxLap) } : item
              )
            }
          >
            +
          </ActionIcon>
        </Group>
      </Center>
      <Center w="100%">
        <Group w="100%" maw="60%" gap="xs" wrap="nowrap">
          <ActionIcon
            size="xs"
            variant="light"
            onClick={() =>
              props.setLapProg(item => (item ? { ...item, diff: adjustValue(item.diff, -0.1, 0.1, -3, 3) } : item))
            }
          >
            –
          </ActionIcon>
          <Slider
            size="xs"
            w="100%"
            min={-3}
            max={3}
            step={0.1}
            value={prog.diff}
            marks={[
              { value: -3, label: '-3' },
              { value: 0, label: '0' },
              { value: 3, label: '3' },
            ]}
            label={value => `Diff: ${value.toFixed(1)}`}
            labelAlwaysOn
            mt={15}
            mb={15}
            onChange={value => props.setLapProg(item => (item ? { ...item, diff: value } : item))}
          />
          <ActionIcon
            size="xs"
            variant="light"
            onClick={() =>
              props.setLapProg(item => (item ? { ...item, diff: adjustValue(item.diff, 0.1, 0.1, -3, 3) } : item))
            }
          >
            +
          </ActionIcon>
        </Group>
      </Center>
    </Stack>
  );
}

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
    laps: 7,
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
      return 0.08;
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

// function useLockMode() {
//   const [lockMode, setLockMode] = useState<LockMode>(LockMode.none);
//   const setLapLock = (n: number) =>
//     lockMode.type !== 'lap' ? setLockMode(LockMode.lap(n)) : setLockMode(LockMode.none);
//   const setOpeningLock = (n: number) =>
//     lockMode.type !== 'opening' ? setLockMode(LockMode.opening(n)) : setLockMode(LockMode.none);
//   const lapLock = lockMode.type === 'lap';
//   const openingLock = lockMode.type === 'opening';

//   return { lockMode, lapLock, setLapLock, openingLock, setOpeningLock };
// }

function useMode(distance: DistanceInfo, lockMode: LockMode, lapProg: LapProgInfo) {
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
    const splits = lapSplits(mode.opening, mode.lap, distance, lapProg);

    return {
      secLap: mode.lap,
      secOpening: mode.opening,
      result: splits.at(-1)!.timeSec,
      setOpeningSec,
      setLapSec,
      setResult,
    };
  }
  // "result" mode

  const { secOpening, secLap } = calculateLapAndOpeningFromLockMode(lockMode, mode.result, distance);

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

const MIN_TIME = 5;
const MAX_TIME = 60;

const calculateMinMaxResult = (lockMode: LockMode, distance: DistanceInfo) => {
  switch (lockMode.type) {
    case 'opening': {
      const minResult = lockMode.opening + distance.laps * MIN_TIME;
      const maxResult = lockMode.opening + distance.laps * MAX_TIME;
      return { minResult, maxResult };
    }
    case 'lap': {
      const minResult = MIN_TIME + distance.laps * lockMode.lap;
      const maxResult = MAX_TIME + distance.laps * lockMode.lap;
      return { minResult, maxResult };
    }
    case 'none': {
      const minResult = MIN_TIME + distance.laps * MIN_TIME;
      const maxResult = MAX_TIME + distance.laps * MAX_TIME;
      return { minResult, maxResult };
    }
  }
};

const calculateLapAndOpeningFromLockMode = (lockMode: LockMode, targetResult: number, distance: DistanceInfo) => {
  switch (lockMode.type) {
    case 'opening': {
      const openingPct = lockMode.opening / targetResult;
      const secOpening = openingPct * targetResult;
      const lapPct = (1 - openingPct) / distance.laps;
      const secLap = lapPct * targetResult;

      return { secOpening, secLap };
    }
    case 'lap': {
      const lapPct = (lockMode.lap * distance.laps) / targetResult;
      const secLap = lockMode.lap;
      const openingPct = 1 - lapPct;
      const secOpening = openingPct * targetResult;
      return { secOpening, secLap };
    }
    case 'none': {
      const openingPct = getOpeningPct(distance);
      const secOpening = openingPct * targetResult;
      if (secOpening < MIN_TIME) {
        const fixedOpeningPct = MIN_TIME / targetResult;
        const lapPct = (1 - fixedOpeningPct) / distance.laps;
        const secLap = lapPct * targetResult;
        return { secOpening: MIN_TIME, secLap };
      }
      if (secOpening > MAX_TIME) {
        const fixedOpeningPct = MAX_TIME / targetResult;
        const lapPct = (1 - fixedOpeningPct) / distance.laps;
        const secLap = lapPct * targetResult;
        return { secOpening: MAX_TIME, secLap };
      }
      const lapPct = (1 - openingPct) / distance.laps;
      const secLap = lapPct * targetResult;
      if (secLap > MAX_TIME) {
        const fixedSecOpening = targetResult - MAX_TIME * distance.laps;
        return { secOpening: fixedSecOpening, secLap: MAX_TIME };
      }
      return { secOpening, secLap };
    }
  }
};

type LapProgInfo = (params: { curLap: number; lapNumber: number }) => number;

function Splits(props: { secOpening: number; secLap: number; distance: DistanceInfo; lapProg: LapProgInfo }) {
  const { secOpening, secLap, distance, lapProg } = props;

  const laps = lapSplits(secOpening, secLap, distance, lapProg);

  return (
    <Table striped highlightOnHover withColumnBorders>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Lap</Table.Th>
          <Table.Th>Distance</Table.Th>
          <Table.Th>Time</Table.Th>
          <Table.Th>Split</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {laps.map(lap => (
          <Table.Tr key={lap.lapNumber}>
            <Table.Td>{lap.lapNumber}</Table.Td>
            <Table.Td>{formatDistance(lap.distance)}</Table.Td>
            <Table.Td>{formatSplitTime(lap.timeSec)}</Table.Td>
            <Table.Td>{formatLap(lap.lapSec)}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function OpeningSlider(props: { distance: DistanceInfo; sec: number; setSec: (n: number) => void }) {
  return (
    <Group gap="sm" align="center" wrap="nowrap">
      <ActionIcon variant="light" onClick={() => props.setSec(adjustValue(props.sec, -0.1, 0.1, MIN_TIME, MAX_TIME))}>
        –
      </ActionIcon>
      <Slider
        color="blue"
        value={props.sec}
        onChange={value => props.setSec(value)}
        styles={{
          bar: { display: 'none' },
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
        mt={15}
        mb={15}
        marks={[10, 20, 30, 40, 50, 60].map(secs => ({
          value: secs,
          label: secs,
        }))}
        label={val => `Opening: ${formatLap(val)}`}
        style={{ flex: 1 }}
      />
      <ActionIcon variant="light" onClick={() => props.setSec(adjustValue(props.sec, 0.1, 0.1, MIN_TIME, MAX_TIME))}>
        +
      </ActionIcon>
    </Group>
  );
}

function LapTimeSlider(props: { secLap: number; setSecLap: (n: number) => void }) {
  return (
    <Group gap="sm" align="center" wrap="nowrap">
      <ActionIcon
        variant="light"
        onClick={() => props.setSecLap(adjustValue(props.secLap, -0.1, 0.1, MIN_TIME, MAX_TIME))}
      >
        –
      </ActionIcon>
      <Slider
        color="blue"
        value={props.secLap}
        onChange={value => props.setSecLap(value)}
        styles={{
          bar: { display: 'none' },
          mark: {
            backgroundColor: '#fff',
            borderColor: '#fff',
          },
        }}
        step={0.1}
        size={'md'}
        labelAlwaysOn
        mt={15}
        mb={15}
        min={5}
        max={60}
        marks={[10, 20, 30, 40, 50, 60].map(secs => ({
          value: secs,
          label: secs,
        }))}
        label={val => `Lap: ${formatLap(val)}`}
        style={{ flex: 1 }}
      />
      <ActionIcon
        variant="light"
        onClick={() => props.setSecLap(adjustValue(props.secLap, 0.1, 0.1, MIN_TIME, MAX_TIME))}
      >
        +
      </ActionIcon>
    </Group>
  );
}

function ResultSlider(props: {
  result: number;
  setResult: (n: number) => void;
  distance: DistanceInfo;
  minResult?: number;
  maxResult?: number;
}) {
  const min = props.minResult ?? MIN_TIME * (props.distance.laps + 1);
  const max = props.maxResult ?? MAX_TIME * (props.distance.laps + 1);

  return (
    <Group gap="sm" align="center" wrap="nowrap">
      <ActionIcon variant="light" onClick={() => props.setResult(adjustValue(props.result, -0.1, 0.1, min, max))}>
        –
      </ActionIcon>
      <Slider
        color="blue"
        value={props.result}
        onChange={value => props.setResult(value)}
        styles={{
          bar: { display: 'none' },
          mark: {
            backgroundColor: '#fff',
            borderColor: '#fff',
          },
        }}
        step={0.1}
        size={'md'}
        labelAlwaysOn
        min={min}
        max={max}
        mt={15}
        mb={15}
        label={val => `Result: ${secKmToMinKm(val)}`}
        style={{ flex: 1 }}
      />
      <ActionIcon variant="light" onClick={() => props.setResult(adjustValue(props.result, 0.1, 0.1, min, max))}>
        +
      </ActionIcon>
    </Group>
  );
}

// function LockButton(props: { locked: boolean; onToggle: () => void }) {
//   return (
//     <div style={{ width: 60, display: 'flex', justifyContent: 'flex-end' }}>
//       <Switch
//         checked={props.locked}
//         onChange={props.onToggle}
//         size="sm"
//         color={props.locked ? 'green' : 'gray'}
//         label={props.locked ? '🔒' : ''}
//       />
//     </div>
//   );
// }

function secKmToMinKm(seconds: number): string {
  const secondsToNearestDecimal = Math.round(seconds * 10) / 10;
  const mins = Math.floor(secondsToNearestDecimal / 60);
  const secs = secondsToNearestDecimal % 60;
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

function adjustValue(value: number, delta: number, step: number, min: number, max: number): number {
  const next = value + delta;
  const snapped = Math.round(next / step) * step;
  const clamped = Math.min(max, Math.max(min, snapped));
  return Number(clamped.toFixed(3));
}

type LapInfo = {
  distance: number;
  timeSec: number;
  lapNumber: number;
  lapSec: number;
};

function lapSplits(secOpening: number, secLap: number, distance: DistanceInfo, lapProgs: LapProgInfo): Array<LapInfo> {
  const laps: Array<LapInfo> = [];
  let curDistance = distance.opening;
  let curTime = secOpening;
  let curLap = secLap;
  for (let lapNumber = 1; lapNumber <= distance.laps + 1; lapNumber++) {
    const lapSec = lapNumber === 1 ? secOpening : curLap;
    laps.push({ distance: curDistance, timeSec: curTime, lapNumber, lapSec });
    curDistance += LAP_DISTANCE;
    curTime += lapNumber === 1 ? secLap : curLap;
    curLap = lapProgs({ curLap, lapNumber });
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
