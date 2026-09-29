// Sin `globals`, Testing Library no registra su limpieza automática: cada prueba parte de un DOM vacío.
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());
