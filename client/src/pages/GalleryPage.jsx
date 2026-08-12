import React, { useState, useEffect } from 'react';
import eventService from '../services/eventService';
import { useToast } from '../hooks/useToast';
import Loader from '../components/common/Loader';

const GalleryPage = () => {
  const { showToast } = useToast();
  
  const [allImages, setAllImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [visibleCount, setVisibleCount] = useState(12);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const getGalleryImageSrc = (url) => {
    if (!url) return '/default-poster.svg';

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    if (url.startsWith('/uploads/')) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const backendBase = apiUrl.replace(/\/api\/?$/, '');
      return `${backendBase}${url}`;
    }

    return url;
  };

  const categories = ['All', 'Technical', 'Cultural', 'Sports', 'Workshop'];

  // Fetch all gallery images
  useEffect(() => {
    let isMounted = true;
    const fetchGallery = async () => {
      try {
        setLoading(true);
        const res = await eventService.getGallery();
        if (isMounted && res.success) {
          setAllImages(res.data || []);
        }
      } catch (err) {
        if (isMounted) {
          showToast('Failed to load gallery', 'error');
          console.error('Error loading gallery:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchGallery();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter images by category
  const filteredImages = activeCategory === 'All' 
    ? allImages 
    : allImages.filter(img => (img.category || img.eventId?.category) === activeCategory);

  // Get visible images
  const visibleImages = filteredImages.slice(0, visibleCount);

  // Handle lightbox navigation
  const handlePrevImage = () => {
    setLightboxIndex(prev => prev === 0 ? filteredImages.length - 1 : prev - 1);
  };

  const handleNextImage = () => {
    setLightboxIndex(prev => prev === filteredImages.length - 1 ? 0 : prev + 1);
  };

  // Handle keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') handlePrevImage();
      if (e.key === 'ArrowRight') handleNextImage();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, filteredImages.length]);

  if (loading) return <Loader />;

  const currentImage = lightboxIndex !== null ? filteredImages[lightboxIndex] : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <section className="bg-gradient-to-br from-slate-900 to-primary text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">📸 Event Gallery</h1>
          <p className="text-slate-200 text-lg">
            Memories from our amazing campus events and celebrations
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Filter Bar */}
        <div className="mb-12">
          <div className="flex gap-3 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setVisibleCount(12);
                  setLightboxIndex(null);
                }}
                className={`px-6 py-2 rounded-full font-semibold transition ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:shadow-md'
                }`}
              >
                {cat === 'All' ? '🌍' : ''}
                {cat === 'Technical' ? '💻' : ''}
                {cat === 'Cultural' ? '🎭' : ''}
                {cat === 'Sports' ? '⚽' : ''}
                {cat === 'Workshop' ? '🛠️' : ''}
                <span className="ml-2">{cat}</span>
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">
            Showing {visibleImages.length} of {filteredImages.length} images
          </p>
        </div>

        {/* Masonry Grid */}
        {visibleImages.length > 0 ? (
          <div
            className="grid gap-4 mb-12"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            }}
          >
            {visibleImages.map((image, idx) => (
              <div
                key={image._id}
                className="group relative rounded-xl overflow-hidden cursor-pointer shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
                onClick={() => setLightboxIndex(filteredImages.indexOf(image))}
                style={{ breakInside: 'avoid' }}
              >
                {/* Image */}
                <div className="relative w-full h-64 bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <img
                    src={getGalleryImageSrc(image.imageUrl)}
                    alt={image.eventId?.title || 'Gallery Image'}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/default-poster.svg';
                    }}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                  />
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col justify-end p-4">
                  <p className="text-white font-bold">{image.eventId?.title || 'Campus Event Photo'}</p>
                  <p className="text-slate-200 text-sm">
                    {(image.category || image.eventId?.category) && (
                      <span className="inline-block mt-2 px-2 py-1 bg-blue-500 rounded-full text-xs">
                        {image.category || image.eventId?.category}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <p className="text-5xl mb-4">📷</p>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
              No Images Found
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              There are currently no images available for this category.
            </p>
          </div>
        )}

        {/* Load More Button */}
        {visibleCount < filteredImages.length && (
          <div className="flex justify-center">
            <button
              onClick={() => setVisibleCount(prev => prev + 6)}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition shadow-md"
            >
              Load More ({filteredImages.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && currentImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-6 right-6 text-white text-3xl hover:text-slate-300 transition z-50"
          >
            ✕
          </button>

          {/* Main Image */}
          <div
            className="relative w-full max-w-4xl"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={getGalleryImageSrc(currentImage.imageUrl)}
              alt={currentImage.eventId?.title}
              className="w-full max-h-screen-80 object-contain rounded-lg"
            />

            {/* Caption */}
            <div className="text-center text-white mt-6">
              <p className="text-lg font-bold">{currentImage.eventId?.title}</p>
              <p className="text-slate-300 text-sm">
                {currentImage.eventId?.category && `${currentImage.eventId.category} Event`}
              </p>
              <p className="text-slate-400 text-xs mt-2">
                {lightboxIndex + 1} / {filteredImages.length}
              </p>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={e => {
                e.stopPropagation();
                handlePrevImage();
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 text-white text-4xl hover:text-slate-300 transition"
            >
              ‹
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                handleNextImage();
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 text-white text-4xl hover:text-slate-300 transition"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryPage;
