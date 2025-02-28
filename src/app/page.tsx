import Image from "next/image";
import { UIProvider } from '../../context/UIContext';
import Layout from '../../components/layout/Layout';

export default function Home() {

  const threadId = '2c7e37b5-3f28-4c9f-9aff-4a365aa3f474';
  const checkpointId = '1eff6109-d964-6fd8-802f-dfe308d7aa96';


  return (
    

    <UIProvider>
      {/* <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-full bg-blue-500"></div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Welcome</h2>
            <p className="text-gray-600">This is a sample component</p>
          </div>
        </div>
        <div className="mt-6">
          <p className="text-gray-700">
            Here's some interesting content that showcases Tailwind's utility classes.
          </p>
          <button className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition-colors">
            Click me
          </button>
        </div>
      </div>
    </div> */}
      <Layout threadId={threadId} checkpointId={checkpointId} />
    </UIProvider>
  );
}
