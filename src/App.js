import { AppRoutes } from './Routers.js';
import { BrowserRouter } from 'react-router-dom';

export default function App() {
	return (
		<>
		<BrowserRouter>
		<AppRoutes />
		</BrowserRouter>
		</>
	);
}
