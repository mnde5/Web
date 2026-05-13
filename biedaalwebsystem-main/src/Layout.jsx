import { Outlet } from 'react-router-dom';
import SideMenu from "./SideMenu";

const Layout = () => {
  return <div className='w-full flex-row gap-4 md:flex'>
    <SideMenu />
    <Outlet />
  </div>
};

export default Layout;
