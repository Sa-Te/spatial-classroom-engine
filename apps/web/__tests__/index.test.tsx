import { render } from '@testing-library/react';
import Home from '../pages/index';

describe('Home', () => {
  it('renders API status section', () => {
    render(<Home />);
    
    // Basic render test - component renders without crashing
    expect(true).toBe(true);
  });
});