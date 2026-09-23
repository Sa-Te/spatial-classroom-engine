import { render, screen } from '@testing-library/react';
import Home from '../pages/index';

describe('Home', () => {
  it('renders API status section', () => {
    render(<Home />);
    
    // Check that the page renders without crashing
    expect(screen.getByText(/Spatial Classroom Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/Application Status/i)).toBeInTheDocument();
  });
});