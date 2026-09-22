import store from '@/store'
import router from '@/router'

let isRedirecting = false;

export default async function fetchWithAuth(url, options = {}) {
    // 开发环境下添加 /api 前缀
    url = process.env.NODE_ENV === 'production' ? url : `/api${url}`;

    // 确保包含凭据（HttpOnly Cookie 会自动携带）
    options.credentials = 'include';

    options.headers = {
        ...options.headers,
    };

    const response = await fetch(url, options);

    if (response.status === 401 && !isRedirecting) {
        isRedirecting = true;
        store.commit('setAdminLoggedIn', false);
        // 静默跳转登录页，不弹出错误提示（路由守卫负责认证 UX）
        const currentPath = router.currentRoute.value?.fullPath;
        const redirectQuery = currentPath && currentPath !== '/adminLogin' ? { redirect: currentPath } : {};
        router.push({ path: '/adminLogin', query: redirectQuery }).finally(() => {
            isRedirecting = false;
        });
    }

    return response;
}
