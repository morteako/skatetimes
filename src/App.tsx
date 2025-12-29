import { Container, Stack } from '@mantine/core';
import Page from './splits';

function App() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Page />
      </Stack>
    </Container>
  );
}

export default App;
