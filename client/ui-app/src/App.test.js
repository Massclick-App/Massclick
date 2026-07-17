import { render, screen } from '@testing-library/react';
import RouteLoadingFallback from './components/RouteLoadingFallback';

jest.mock(
  'react-router-dom',
  () => ({
    useLocation: () => ({ pathname: '/' }),
  }),
  { virtual: true },
);

test('renders a geometry-stable homepage fallback with the final LCP text', () => {
  const { container } = render(<RouteLoadingFallback />);

  expect(
    screen.getByRole('heading', { name: /explore\. connect\. succeed local\./i }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/find trusted businesses and services near you\./i),
  ).toBeInTheDocument();
  expect(container.querySelector('[data-home-route-shell]')).toBeInTheDocument();
  expect(container.querySelectorAll('.home-route-shell__field')).toHaveLength(2);
});
