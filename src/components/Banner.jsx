import React, { useState, useEffect } from 'react';
import { Button, Spin } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import { staticApi } from '../api';

const Banner = () => {
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
                console.log('下载配置加载成功:', res);
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

export default Banner;