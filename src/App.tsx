import { useState } from 'react';
import { Button, Container, Group, Stack, Text, Title } from '@mantine/core';
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
