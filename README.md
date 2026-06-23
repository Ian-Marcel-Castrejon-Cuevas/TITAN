# cadnux-app 🚀

**cadnux-app** is a robust web application built with Next.js, designed to provide a comprehensive platform for managing [**TODO: Briefly describe the core purpose of cadnux-app here. For example, "employee data, security information, and operational tasks" or "ticketing and support requests"**]. It leverages a modern tech stack to deliver a performant, secure, and user-friendly experience.

This project integrates a frontend developed in TypeScript/React with a backend service written in Python, enabling seamless data exchange and complex logic execution.

## Features ⚡

*   **Secure Authentication**: User authentication and authorization to protect sensitive data.
*   **Dynamic Dashboard**: An interactive dashboard providing key insights and overview of [**TODO: Specify what the dashboard displays**].
*   **Ticket Management**: System for creating, tracking, and resolving support or operational tickets.
*   **User Registration**: Secure process for new user onboarding.
*   **Data Visualization**: Utilizes Recharts for displaying data graphically.
*   **Real-time Notifications**: Provides immediate feedback and updates to users.
*   **API Integration**: Connects with a Python-based backend for comprehensive functionality.
*   **Internationalization**: Supports multiple languages [**TODO: Confirm if this is implemented or a future feature**].
*   **[Add other key features here]**

## Tech Stack 📦

*   **Frontend**:
    *   Next.js
    *   TypeScript
    *   React
    *   React Query (@tanstack/react-query) for state management
    *   Tailwind CSS for styling
    *   Lucide React for icons
    *   React Hot Toast for notifications
    *   Axios for HTTP requests
    *   Crypto-JS for client-side encryption [**TODO: Confirm usage of Crypto-JS on the frontend**]
*   **Backend (cadnux-backend)**:
    *   Python
    *   [**TODO: Specify Python web framework if any, e.g., Flask, FastAPI**]
    *   MSSQL, PostgreSQL (pg) for database interactions
    *   Bcryptjs for password hashing
    *   jsonwebtoken for token generation
    *   SSH2 for secure remote connections
    *   Twofish for encryption [**TODO: Confirm usage of Twofish on the backend**]
    *   XLSX for Excel file processing
*   **Development Tools**:
    *   ESLint for code linting
    *   Prettier for code formatting
    *   TypeScript for type checking

## Installation 🛠️

Follow these steps to set up and run `cadnux-app` locally:

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   Python (v3.10 or later recommended)
*   [**TODO: Specify database requirements, e.g., MSSQL Server, PostgreSQL instance details**]
*   [**TODO: Specify any other system dependencies**]

### Frontend Setup

1.  **Clone the repository**:
    ```bash
    git clone [repository_url]
    cd cadnux-app
    ```

2.  **Install frontend dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure environment variables**:
    Create a `.env.local` file in the root directory and add your environment variables. Refer to the **Configuration** section for details.

### Backend Setup

1.  **Navigate to the backend directory**:
    ```bash
    cd cadnux-backend
    ```

2.  **Create and activate a virtual environment**:
    ```bash
    python -m venv venv310
    # On Windows
    .\venv310\Scripts\activate
    # On macOS/Linux
    source venv310/bin/activate
    ```

3.  **Install backend dependencies**:
    ```bash
    pip install -r requirements.txt # Assuming a requirements.txt exists, otherwise list packages
    ```

4.  **Configure backend environment variables**:
    Refer to the backend's documentation or create a `.env` file in the `cadnux-backend` directory for necessary configurations.

### Running the Application

1.  **Start the backend server**:
    *   Navigate to the `cadnux-backend` directory.
    *   Ensure your virtual environment is activated.
    *   Run the backend application:
        ```bash
        python app.py # Or the command to start your backend
        ```
    *   [**TODO: Specify the port the backend runs on**]

2.  **Start the frontend development server**:
    *   In a separate terminal, navigate back to the root `cadnux-app` directory.
    *   Run the Next.js development server:
        ```bash
        npm run dev
        # or
        yarn dev
        ```

3.  **Access the application**:
    Open your web browser and navigate to `http://localhost:3000` (or the port specified by the Next.js development server).

## Usage 🚀

Once the application is running, you can:

1.  **Login**: Navigate to the `/login` route and enter your credentials.
2.  **Register**: New users can register via the `/registro` route.
3.  **Dashboard**: Access the main dashboard at `/dashboard` after logging in.
4.  **Tickets**: Manage tickets at `/tickets`.
5.  **Support**: Access support features at `/soporte`.
6.  **[Add other usage examples here]**

## Project Structure 📂

```
.
├── AGENTS.md                 # Information about agents
├── app/                      # Next.js App Router directory
│   ├── api/                  # API routes
│   ├── dashboard/            # Dashboard related pages
│   ├── favicon.ico
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   ├── login/                # Login page
│   ├── page.tsx              # Home page
│   ├── registro/             # Registration page
│   ├── soporte/              # Support pages
│   └── tickets/              # Ticket management pages
├── cadnux-backend/           # Python backend service
│   ├── app.py                # Main backend application entry point
│   ├── venv310/              # Python virtual environment
│   └── verificar_conexion_remota.py # Script for remote connection verification
├── components/               # Reusable UI components
│   ├── layout/
│   ├── ProfilePhoto.tsx
│   ├── SecurityWrapper.tsx
│   └── ui/                   # UI primitives/libraries
├── context/                  # React Context providers
│   └── NotificationContext.tsx
├── eslint.config.mjs         # ESLint configuration
├── hooks/                    # Custom React hooks
│   ├── useAuth.tsx
│   ├── useDashboardNotifications.ts
│   ├── useEmpleadoFoto.tsx
│   ├── useNotification.ts
│   ├── useNotifications.ts
│   └── useTickets.tsx
├── lib/                      # Utility functions and helper modules
├── middleware.ts             # Next.js middleware for routing and auth
├── next-env.d.ts             # Next.js TypeScript definitions
├── next.config.ts            # Next.js configuration
├── nginx-1.30.2/             # Nginx configuration files (likely for deployment)
│   ├── conf/
│   ├── contrib/
│   ├── docs/
│   ├── html/
│   ├── logs/
│   └── nginx.exe
├── package-lock.json
├── package.json              # Frontend package manager configuration
├── postcss.config.mjs        # PostCSS configuration
├── public/                   # Static assets
├── README.md                 # This file
├── tailwind.config.js        # Tailwind CSS configuration
└── tsconfig.json             # TypeScript configuration
```

## Configuration ⚙️

The application relies on environment variables for configuration. Create a `.env.local` file in the root directory of the project with the following variables (and adjust as needed for your backend):

```env
# Frontend Configuration
NEXT_PUBLIC_API_URL="http://localhost:[backend_port]/api" # URL to your backend API

# Backend Configuration (example, adjust based on your backend's needs)
DATABASE_SERVER="your_db_server"
DATABASE_USER="your_db_user"
DATABASE_PASSWORD="your_db_password"
DATABASE_NAME="your_db_name"
JWT_SECRET="your_super_secret_key_for_jwt"
# Add other backend-specific environment variables here
```

**Note**: Ensure your Python backend (`cadnux-backend`) is also configured to read its environment variables, potentially using a `.env` file within its directory or other configuration methods.

## Contributing 🤝

We welcome contributions to `cadnux-app`! If you'd like to contribute, please:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix (`git checkout -b feature/your-feature-name`).
3.  Make your changes and commit them (`git commit -m 'Add some feature'`).
4.  Push to the branch (`git push origin feature/your-feature-name`).
5.  Open a Pull Request.

Please ensure your code adheres to the project's coding standards and includes appropriate tests.

## License 📜

This project is licensed under the **[TODO: Specify your license here, e.g., MIT License]** License. See the [LICENSE.md](LICENSE.md) file for more details.