import {
  ActionIcon,
  Button,
  Center,
  Group,
  Modal,
  RangeSlider,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { useEffect, useState } from 'react';

type LapProgMode = 'static' | 'accumlative';
type LapProg = { startLap: number; diff: number; mode: LapProgMode };
type LapTimeSettings = { min: number; max: number };

const LAP_TIME_SETTINGS_KEY = 'lapTimeSettings';
const MIN_ALLOWED_LAP_TIME = 20;
const MAX_ALLOWED_LAP_TIME = 60;
const DEFAULT_LAP_TIME_SETTINGS: LapTimeSettings = { min: 30, max: 50 };

export default function Page() {
  const distanceOptions = Object.keys(distances).map(distance => ({
    value: distance,
    label: `${distance}m`,
  }));
  const [selectedDistance, setSelectedDistance] = useState<Distance>(getInitialDistance);

  const distance = distances[selectedDistance];

  const [lapTimeSettings, setLapTimeSettings] = useState<LapTimeSettings>(getInitialLapTimeSettings);
  const [showSettings, setShowSettings] = useState(false);

  const { secLap, secOpening, result, setOpeningSec, setLapSec, setResult, lapProg, setLapProg, lapProgFunc } = useMode(
    distance,
    lapTimeSettings
  );

  const { results } = calculateMinMax(distance, lapTimeSettings);
  const [showSplits, setShowSplits] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('distance', distance.distance.toString());
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', next);
  }, [selectedDistance]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(LAP_TIME_SETTINGS_KEY, JSON.stringify(lapTimeSettings));
  }, [lapTimeSettings]);

  return (
    <Stack maw={'500px'} w={'100%'} gap={'30px'}>
      <Center>
        <Group align="end" gap="sm" wrap="nowrap">
          <Select
            maw={'150px'}
            label="Distance"
            data={distanceOptions}
            value={selectedDistance.toString()}
            onChange={value => value && setSelectedDistance(parseInt(value, 10) as Distance)}
            allowDeselect={false}
            styles={{ input: { fontSize: '16px' } }}
          />
          <ActionIcon aria-label="Open settings" variant="light" mb="5px" onClick={() => setShowSettings(true)}>
            ⚙
          </ActionIcon>
        </Group>
      </Center>
      <Modal opened={showSettings} onClose={() => setShowSettings(false)} title="Settings" centered>
        <Text size="sm" c="dimmed" mb="xs">
          Choose the lap-time range you want available.
        </Text>
        <RangeSlider
          min={MIN_ALLOWED_LAP_TIME}
          max={MAX_ALLOWED_LAP_TIME}
          step={1}
          labelAlwaysOn
          mx="xs"
          mt={36}
          styles={{ root: { overflow: 'visible' } }}
          marks={[20, 30, 40, 50, 60].map(value => ({ value, label: value.toString() }))}
          value={[lapTimeSettings.min, lapTimeSettings.max]}
          onChange={value => setLapTimeSettings(normalizeLapTimeSettings(value[0], value[1]))}
          minRange={1}
          mb={15}
          label={value => `${Math.abs(value - lapTimeSettings.min) < 0.0001 ? 'Min' : 'Max'}: ${formatLap(value)}`}
        />
      </Modal>
      <Stack mt="10px" gap={'30px'}>
        <ResultSlider
          distance={distance}
          result={result}
          setResult={(result: number) => {
            setLapProg(lapProg === null ? null : { ...lapProg, diff: 0 });
            setResult(result);
          }}
          minResult={results.min}
          maxResult={results.max}
          hasActiveLapProg={lapProg !== null}
        />
        <OpeningSlider distance={distance} sec={secOpening} setSec={setOpeningSec} lapTimeSettings={lapTimeSettings} />
        <LapTimeSlider
          secLap={secLap}
          setSecLap={setLapSec}
          minLap={lapTimeSettings.min}
          maxLap={lapTimeSettings.max}
        />
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
            <Button variant="subtle" onClick={() => setLapProg({ startLap: 2, diff: 0.1, mode: 'accumlative' })}>
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
    return (params: { curLap: number; lapNumber: number; baseLap: number }) => params.curLap;
  }
  return (params: { curLap: number; lapNumber: number; baseLap: number }) => {
    // +1 workaround for what seems like a small bug. but works now
    if (params.lapNumber + 1 < lapProg.startLap) {
      return params.curLap;
    }
    if (lapProg.mode === 'static') {
      return Math.max(0, params.baseLap + lapProg.diff); // will not work with multiple
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
        <SegmentedControl
          value={prog.mode}
          onChange={value => props.setLapProg(item => (item ? { ...item, mode: value as LapProgMode } : item))}
          data={[
            { label: 'Fixed', value: 'static' },
            { label: 'Progressive', value: 'accumlative' },
          ]}
        />
      </Center>
      <Center w="100%">
        <Group w="100%" maw="70%" gap="xs" wrap="nowrap">
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
            max={props.maxLap + 1}
            step={1}
            value={prog.startLap}
            marks={[
              { value: 2, label: '2' },
              { value: props.maxLap + 1, label: (props.maxLap + 1).toString() },
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
        <Group w="100%" maw="70%" gap="xs" wrap="nowrap">
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
            min={-5}
            max={5}
            step={0.1}
            value={prog.diff}
            marks={[
              { value: -5, label: '-5' },
              { value: 0, label: '0' },
              { value: 5, label: '5' },
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

type Mode =
  | { type: 'result'; result: number; distance: DistanceInfo }
  | { type: 'laps'; lap: number; opening: number; distance: DistanceInfo }; // TODO type opening

function useMode(distance: DistanceInfo, lapTimeSettings: LapTimeSettings) {
  const [mode, setMode] = useState<Mode>({
    type: 'laps',
    lap: clamp(40, lapTimeSettings.min, lapTimeSettings.max),
    opening: 20,
    distance,
  });

  const [lapProg, setLapProg] = useState<LapProg | null>(null);

  const lapProgFunc = makeLapProgFunc(lapProg);

  if (mode.type === 'laps') {
    const setOpeningSec = (opening: number) => {
      setMode({ ...mode, opening });
    };
    const setLapSec = (lap: number) => {
      setMode({ ...mode, lap: clamp(lap, lapTimeSettings.min, lapTimeSettings.max) });
    };
    const setResult = (result: number) => {
      setMode({ type: 'result', result, distance });
    };
    const splits = lapSplits(mode.opening, mode.lap, distance, lapProgFunc);

    const minMax = calculateMinMax(distance, lapTimeSettings);

    return {
      secLap: mode.lap,
      secOpening: clamp(mode.opening, minMax.openings.min, minMax.openings.max),
      result: splits.at(-1)!.timeSec,
      setOpeningSec,
      setLapSec,
      setResult,
      lapProg,
      setLapProg,
      lapProgFunc,
    };
  }
  //if mod.type === 'result'

  const { secOpening, secLap } = calculateLapAndOpening(mode.result, distance, lapTimeSettings);

  const setOpeningSec = (opening: number) => {
    setMode({ type: 'laps', lap: secLap, opening, distance });
  };
  const setLapSec = (lap: number) => {
    // is the clamp needed?
    setMode({ type: 'laps', lap: clamp(lap, lapTimeSettings.min, lapTimeSettings.max), opening: secOpening, distance });
  };
  const setResult = (result: number) => {
    setMode({ ...mode, result });
  };

  return {
    secLap,
    secOpening,
    result: mode.result,
    setOpeningSec,
    setLapSec,
    setResult,
    lapProg,
    setLapProg,
    lapProgFunc,
  };
}

const MIN_TIME_OPENING = 5;
const MAX_TIME_OPENING = 60;

const calculateMinMax = (distance: DistanceInfo, lapTimeSettings: LapTimeSettings) => {
  const minOpening = floorNearest5(getOpeningPct(distance) * lapTimeSettings.min * distance.laps);
  const maxOpening = ceilNearest5(getOpeningPct(distance) * lapTimeSettings.max * distance.laps);
  const minResult = MIN_TIME_OPENING + distance.laps * lapTimeSettings.min;
  const maxResult = MAX_TIME_OPENING + distance.laps * lapTimeSettings.max;
  return { results: { min: minResult, max: maxResult }, openings: { min: minOpening, max: maxOpening } };
};

const floorNearest5 = (x: number) => Math.floor(x / 5) * 5;
const ceilNearest5 = (x: number) => Math.ceil(x / 5) * 5;

const calculateLapAndOpening = (targetResult: number, distance: DistanceInfo, lapTimeSettings: LapTimeSettings) => {
  const openingPct = getOpeningPct(distance);
  const secOpening = openingPct * targetResult;

  const { openings } = calculateMinMax(distance, lapTimeSettings);

  if (secOpening < openings.min) {
    const fixedOpeningPct = openings.min / targetResult;
    const lapPct = (1 - fixedOpeningPct) / distance.laps;
    const secLap = lapPct * targetResult;
    return { secOpening: openings.min, secLap };
  }
  if (secOpening > openings.max) {
    const fixedOpeningPct = openings.max / targetResult;
    const lapPct = (1 - fixedOpeningPct) / distance.laps;
    const secLap = lapPct * targetResult;
    return { secOpening: openings.max, secLap };
  }
  const lapPct = (1 - openingPct) / distance.laps;
  const secLap = lapPct * targetResult;
  if (secLap > lapTimeSettings.max) {
    const fixedSecOpening = targetResult - lapTimeSettings.max * distance.laps;
    return { secOpening: fixedSecOpening, secLap: lapTimeSettings.max };
  }
  if (secLap < lapTimeSettings.min) {
    const fixedSecOpening = targetResult - lapTimeSettings.min * distance.laps;
    return { secOpening: fixedSecOpening, secLap: lapTimeSettings.min };
  }
  return { secOpening, secLap };
};

type LapProgInfo = (params: { curLap: number; lapNumber: number; baseLap: number }) => number;

function Splits(props: { secOpening: number; secLap: number; distance: DistanceInfo; lapProg: LapProgInfo }) {
  const { secOpening, secLap, distance, lapProg } = props;

  const laps = lapSplits(secOpening, secLap, distance, lapProg);

  return (
    <Table striped highlightOnHover withColumnBorders>
      <Table.Thead>
        <Table.Tr>
          <Table.Th style={{ width: '50px' }}>Lap</Table.Th>
          <Table.Th>Distance</Table.Th>
          <Table.Th>Time</Table.Th>
          <Table.Th>Split</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {laps.map(lap => (
          <Table.Tr key={lap.lapNumber}>
            <Table.Td style={{ width: '50px' }}>{lap.lapNumber}</Table.Td>
            <Table.Td>{formatDistance(lap.distance)}</Table.Td>
            <Table.Td>{formatSplitTime(lap.timeSec)}</Table.Td>
            <Table.Td>{formatLap(lap.lapSec)}</Table.Td>
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
  lapTimeSettings: LapTimeSettings;
}) {
  const { openings } = calculateMinMax(props.distance, props.lapTimeSettings);

  const nums = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
  const marks = nums
    .filter(x => x >= openings.min && x <= openings.max)
    .map(secs => ({
      value: secs,
      label: secs,
    }));

  return (
    <Group gap="sm" align="center" wrap="nowrap">
      <ActionIcon
        variant="light"
        onClick={() => props.setSec(adjustValue(props.sec, -0.1, 0.1, openings.min, openings.max))}
      >
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
        min={openings.min}
        max={openings.max}
        mt={15}
        mb={15}
        marks={marks}
        label={val => `Opening: ${formatLap(val)}`}
        style={{ flex: 1 }}
      />
      <ActionIcon
        variant="light"
        onClick={() => props.setSec(adjustValue(props.sec, 0.1, 0.1, openings.min, openings.max))}
      >
        +
      </ActionIcon>
    </Group>
  );
}

function LapTimeSlider(props: { secLap: number; setSecLap: (n: number) => void; minLap: number; maxLap: number }) {
  return (
    <Group gap="sm" align="center" wrap="nowrap">
      <ActionIcon
        variant="light"
        onClick={() => props.setSecLap(adjustValue(props.secLap, -0.1, 0.1, props.minLap, props.maxLap))}
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
        min={props.minLap}
        max={props.maxLap}
        marks={[20, 25, 30, 35, 40, 45, 50, 55, 60]
          .filter(n => n >= props.minLap && n <= props.maxLap)
          .map(secs => ({
            value: secs,
            label: secs,
          }))}
        label={val => `Lap: ${formatLap(val)}`}
        style={{ flex: 1 }}
      />
      <ActionIcon
        variant="light"
        onClick={() => props.setSecLap(adjustValue(props.secLap, 0.1, 0.1, props.minLap, props.maxLap))}
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
  minResult: number;
  maxResult: number;
  hasActiveLapProg: boolean;
}) {
  const min = props.minResult;
  const max = props.maxResult;

  const locked = props.hasActiveLapProg;
  if (locked) {
    return (
      <Group gap="sm" align="center" justify="center" wrap="nowrap">
        <Text
          fz="sm"
          c="white"
          bg="gray.9"
          px="sm"
          py={6}
          style={{ borderRadius: 'var(--mantine-radius-sm)', lineHeight: 1, userSelect: 'none' }}
        >
          Result: {secKmToMinKm(props.result)}
        </Text>
      </Group>
    );
  }

  return (
    <Group gap="sm" align="center" wrap="nowrap">
      <ActionIcon
        disabled={locked}
        variant="light"
        onClick={() => props.setResult(adjustValue(props.result, -0.1, 0.1, min, max))}
      >
        –
      </ActionIcon>
      <Slider
        value={props.result}
        onChange={value => {
          if (!locked) props.setResult(value);
        }}
        color={locked ? 'gray' : 'blue'}
        styles={{
          bar: { display: 'none' },
        }}
        style={{ flex: 1, pointerEvents: locked ? 'none' : 'auto' }}
        step={1}
        size={'md'}
        labelAlwaysOn
        min={min}
        max={max}
        mt={15}
        mb={15}
        label={val => `Result: ${secKmToMinKm(val)}${locked ? ' (Locked)' : ''}`}
      />
      <ActionIcon
        disabled={locked}
        variant="light"
        onClick={() => props.setResult(adjustValue(props.result, 0.1, 0.1, min, max))}
      >
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
    curLap = lapProgs({ curLap, lapNumber, baseLap: secLap });
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

function getInitialLapTimeSettings(): LapTimeSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_LAP_TIME_SETTINGS;
  }
  const stored = window.localStorage.getItem(LAP_TIME_SETTINGS_KEY);
  if (!stored) {
    return DEFAULT_LAP_TIME_SETTINGS;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<LapTimeSettings>;
    if (typeof parsed.min !== 'number' || typeof parsed.max !== 'number') {
      return DEFAULT_LAP_TIME_SETTINGS;
    }
    return normalizeLapTimeSettings(parsed.min, parsed.max);
  } catch {
    return DEFAULT_LAP_TIME_SETTINGS;
  }
}

function normalizeLapTimeSettings(min: number, max: number): LapTimeSettings {
  const normalizedMin = clamp(min, MIN_ALLOWED_LAP_TIME, MAX_ALLOWED_LAP_TIME);
  const normalizedMax = clamp(max, MIN_ALLOWED_LAP_TIME, MAX_ALLOWED_LAP_TIME);

  if (normalizedMin > normalizedMax) {
    return { min: normalizedMax, max: normalizedMin };
  }
  return { min: normalizedMin, max: normalizedMax };
}
