import React, { useState, useEffect } from 'react';
import { Button, Spin } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import { staticApi } from '../api';
import { IS_TEST, CURRENT_ENV, setTestVersion } from '../config/envConfig';

// ───────────── 测试服:版本探测 Worker + R2 下载链接 ─────────────
// QQ 频道（社区）入口
const COMMUNITY_URL = 'https://pd.qq.com/s/2knid2ww3';
// 官网正式服入口
const OFFICIAL_URL = 'https://www.azurchess.top/';
// 版本探测 Worker：返回 { version: "0.27.3.14" }
const VERSION_API = 'https://version.azurchess.2d-gate.cc';
// R2 测试服发布目录
const RELEASE_BASE = 'https://file.azurchess.2d-gate.cc/Releases/Dev';
// Worker / 网络不可用时的回退版本
const FALLBACK_VERSION = '0.27.3.14';

// 按 R2 (Releases/Dev) 文件命名规则拼接下载链接，含空格/中文需 URL 编码
const buildDownloads = (version) => [
    { key: 'win64', label: '下载游戏（Win64）', url: `${RELEASE_BASE}/${encodeURIComponent(`${version}.zip`)}` },
    { key: 'win64-pack', label: '下载游戏（Win64+资源包）', url: `${RELEASE_BASE}/${encodeURIComponent(`${version} - 含资源包.zip`)}` },
    { key: 'android', label: '下载游戏（Android）', url: `${RELEASE_BASE}/${encodeURIComponent(`AzurChessBeta-${version}.apk`)}` },
];

// 测试服首屏（暗色 / 新版式）—— 当前工作区现状
const TestBanner = () => {
    const [bannerImages, setBannerImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [version, setVersion] = useState(CURRENT_ENV.version || FALLBACK_VERSION);

    useEffect(() => {
        const fetchImages = () => {
            try {
                const imageCount = 6; // 0-5 共 6 张图
                const images = Array.from({ length: imageCount }, (_, i) => `/picture/${i}.jpg`);
                setBannerImages(images);
            } catch (error) {
                console.error('加载轮播图失败:', error);
                setBannerImages(['/picture/0.jpg']);
            } finally {
                setLoading(false);
            }
        };

        // 向 Worker 询问 R2 上的最新版本，失败时保留回退版本
        const fetchVersion = async () => {
            try {
                const res = await fetch(VERSION_API, { cache: 'no-store' });
                if (!res.ok) return;
                const data = await res.json();
                if (data && data.version) {
                    setVersion(data.version);
                    setTestVersion(data.version);
                }
            } catch (error) {
                console.error('获取最新版本失败，使用回退版本:', error);
            }
        };

        fetchImages();
        fetchVersion();
    }, []);

    // 下载按钮按当前版本动态拼接
    const downloadButtons = buildDownloads(version);

    return (
        <div className="acb-hero" id="home">
            {loading ? (
                <div style={{
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <Spin size="large" tip="加载中..." />
                </div>
            ) : (
                <>
                    {/* 背景角色立绘轮播 */}
                    <Swiper
                        modules={[Autoplay]}
                        spaceBetween={0}
                        slidesPerView={1}
                        autoplay={{ delay: 5000, disableOnInteraction: false }}
                        loop={true}
                        style={{ height: '100%' }}
                    >
                        {bannerImages.map((imgUrl, index) => (
                            <SwiperSlide key={index}>
                                <div
                                    className="acb-hero__slide"
                                    style={{ backgroundImage: `url(${imgUrl})` }}
                                />
                            </SwiperSlide>
                        ))}
                    </Swiper>

                    {/* 文案 + 下载面板 */}
                    <div className="acb-hero__overlay">
                        <h1 className="acb-hero__title">碧蓝战棋 - 测试服</h1>
                        <p className="acb-hero__subtitle">—— 碧蓝航线海战棋测试服下载地址 ——</p>
                        <p className="acb-hero__hint">测试服更新内容请前往海战棋社区查看</p>

                        <div className="acb-channel">
                            <a
                                className="acb-channel__badge"
                                href={COMMUNITY_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <img
                                    alt="QQ频道"
                                    src="https://img.shields.io/badge/QQ%E9%A2%91%E9%81%93-2234%E7%9A%84%E6%A8%A1%E6%8B%9F%E8%AF%95%E9%AA%8C%E5%9C%BA_pd90772476-blue"
                                />
                            </a>
                        </div>

                        <div className="acb-downloads">
                            {downloadButtons.map((item) => (
                                <Button
                                    key={item.key}
                                    type="primary"
                                    size="large"
                                    icon={<DownloadOutlined />}
                                    href={item.url}
                                >
                                    {item.label}
                                </Button>
                            ))}
                            <Button size="large" href={OFFICIAL_URL} target="_blank" rel="noopener noreferrer">
                                官网正式服
                            </Button>
                        </div>

                        <p className="acb-hero__version">当前测试服版本：{version}</p>
                    </div>
                </>
            )}
        </div>
    );
};

// 正式服首屏（亮色 / 原版式）—— 还原 main 分支
const ProdBanner = () => {
    const [bannerImages, setBannerImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloadConfig, setDownloadConfig] = useState({
        version: 'U25.1119',
        downloads: {
            windows: {
                label: '下载游戏（Win64）',
                url: 'https://file.azurchess.top/AzurChess%20U25.1119.zip'
            },
            android: {
                label: '下载游戏（Android）',
                url: 'https://file.azurchess.top/AzurChess%20U25.1119.apk'
            }
        }
    });

    // 动态加载图片列表
    useEffect(() => {
        // 直接指定图片路径规则
        const fetchImages = async () => {
            try {
                const imageCount = 6; // 0-5共6张图
                const images = Array.from({ length: imageCount }, (_, i) =>
                    `/picture/${i}.jpg` // 假设图片在public/picture目录下
                );
                setBannerImages(images);
            } catch (error) {
                console.error('加载轮播图失败:', error);
                // 加载失败时使用默认图
                setBannerImages(['/picture/0.jpg']);
            } finally {
                setLoading(false);
            }
        };

        const fetchDownloadConfig = async () => {
            try {
                const res = await staticApi.getDownloadConfig();
                setDownloadConfig(res.data);
            } catch (error) {
                console.error('加载下载配置失败:', error);
            }
        };

        fetchImages();
        fetchDownloadConfig();
    }, []);

    return (
        <div className="banner-container" id="home" style={{ position: 'relative', height: '70vh' }}>
            {loading ? (
                // 加载状态
                <div style={{
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: '#000'
                }}>
                    <Spin size="large" tip="加载图片中..." style={{ color: '#fff' }} />
                </div>
            ) : (
                <>
                    {/* 背景轮播图 */}
                    <Swiper
                        modules={[Autoplay]}
                        spaceBetween={0}
                        slidesPerView={1}
                        autoplay={{
                            delay: 5000,
                            disableOnInteraction: false
                        }}
                        loop={true}
                        style={{ height: '100%' }}
                    >
                        {bannerImages.map((imgUrl, index) => (
                            <SwiperSlide key={index}>
                                <div
                                    style={{
                                        backgroundImage: `url(${imgUrl})`,
                                        backgroundPosition: 'center',
                                        backgroundSize: 'cover',
                                        height: '100%'
                                    }}
                                />
                            </SwiperSlide>
                        ))}
                    </Swiper>

                    {/* 固定的下载面板 */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: 'white',
                        textAlign: 'center',
                        zIndex: 10
                    }}>
                        <h2 style={{ fontSize: '48px', marginBottom: '16px' }}>碧蓝战棋</h2>
                        <p style={{ fontSize: '24px', marginBottom: '32px' }}>——专属于碧蓝航线的同人战棋游戏 ——</p>
                        <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <Button
                                type="primary"
                                size="large"
                                icon={<DownloadOutlined />}
                                style={{ margin: '8px', padding: '0 24px' }}
                                href={downloadConfig.downloads.windows.url}
                            >
                                {downloadConfig.downloads.windows.label}
                            </Button>
                            <Button
                                type="primary"
                                size="large"
                                icon={<DownloadOutlined />}
                                style={{ margin: '8px', padding: '0 24px' }}
                                href={downloadConfig.downloads.android.url}
                            >
                                {downloadConfig.downloads.android.label}
                            </Button>
                            <Button
                                type="primary"
                                size="large"
                                style={{ margin: '8px', padding: '0 24px' }}
                                as="a"  // 使用antd的as属性将按钮转为a标签
                                href="#about"
                            >
                                了解更多
                            </Button>
                        </div>
                        <p>当前版本：{downloadConfig.version}</p>
                    </div>
                </>
            )}
        </div>
    );
};

const Banner = () => (IS_TEST ? <TestBanner /> : <ProdBanner />);

export default Banner;
