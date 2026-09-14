import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardDistributionMap from './DashboardDistributionMap';

test('fits separate areas within a city and filters cities without duplicate options', () => {
  const onLocationClick = jest.fn();
  render(<DashboardDistributionMap onLocationClick={onLocationClick} clusters={[
    { name: 'Trichy', lat: 10.79, lng: 78.70, count: 120 },
    { name: 'Trichy', lat: 10.85, lng: 78.75, count: 80 },
    { name: 'Madurai', lat: 9.92, lng: 78.12, count: 50 },
  ]} />);
  expect(screen.getByRole('button', { name: 'Trichy: 120 businesses' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Trichy: 80 businesses' })).toBeInTheDocument();
  expect(screen.getAllByRole('option', { name: 'Trichy' })).toHaveLength(1);
  fireEvent.change(screen.getByLabelText('Map location'), { target: { value: 'Trichy' } });
  expect(screen.queryByRole('button', { name: 'Madurai: 50 businesses' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Trichy: 80 businesses' }));
  expect(onLocationClick).toHaveBeenCalledWith('Trichy');
  fireEvent.change(screen.getByLabelText('Map location'), { target: { value: '' } });
  expect(screen.getByRole('button', { name: 'Madurai: 50 businesses' })).toBeInTheDocument();
});
