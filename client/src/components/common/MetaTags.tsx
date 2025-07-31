import { useEffect } from 'react';

interface MetaTagsProps {
  title?: string;
  description?: string;
  imageUrl?: string;
  url?: string;
  type?: string;
  creatorName?: string;
}

/**
 * Component that updates meta tags for better sharing preview in social media apps
 * Especially important for WhatsApp which uses Open Graph meta tags
 */
const MetaTags = ({
  title = "Take This Quiz! 🎯",
  description = "I created this quiz for you! Think you can get all the answers right? Take the challenge and see how well you score!",
  imageUrl = "/favicon.png",
  url,
  type = "website",
  creatorName
}: MetaTagsProps) => {
  
  useEffect(() => {
    // Get the absolute URL for the image with hostname
    const fullImageUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : `${window.location.origin}${imageUrl}`;
    
    // Get current URL if none provided
    const pageUrl = url || window.location.href;
    
    // Create canonical URL (without www prefix)
    const canonicalUrl = pageUrl.replace('www.qzonme.com', 'qzonme.com');
    
    // Create personalized title and description if creator name is provided
    const personalizedTitle = creatorName 
      ? `${creatorName} Created This Quiz For You! 🎯` 
      : title;
      
    const personalizedDescription = creatorName
      ? `${creatorName} created this quiz for you! Think you can get all the answers right? Take the challenge and see how well you score!`
      : description;

    // Update or create canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    // Update Open Graph tags
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', personalizedTitle);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', personalizedDescription);
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', fullImageUrl);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', pageUrl);
    document.querySelector('meta[property="og:type"]')?.setAttribute('content', type);
    
    // Update Twitter Card tags
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', personalizedTitle);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', personalizedDescription);
    document.querySelector('meta[name="twitter:image"]')?.setAttribute('content', fullImageUrl);
    
    // Update document title as well
    document.title = personalizedTitle;
    
    // Log that meta tags were updated
    console.log("Meta tags updated:", { 
      personalizedTitle, 
      personalizedDescription, 
      fullImageUrl, 
      pageUrl,
      canonicalUrl
    });
    
  }, [title, description, imageUrl, url, type, creatorName]);

  // This component doesn't render anything
  return null;
};

export default MetaTags;