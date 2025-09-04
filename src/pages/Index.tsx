import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const Index = () => {
  const [clickCount, setClickCount] = useState(0);
  const [isPartyMode, setIsPartyMode] = useState(false);

  const handleFunClick = () => {
    setClickCount(prev => prev + 1);
    if (clickCount + 1 >= 5) {
      setIsPartyMode(true);
      setTimeout(() => setIsPartyMode(false), 3000);
    }
  };

  const emojis = ['🎉', '🎊', '🎈', '🎁', '🌈', '✨', '🦄', '🎵', '🎭', '🎪'];
  
  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {emojis.map((emoji, i) => (
          <div
            key={i}
            className={`absolute text-4xl animate-float ${isPartyMode ? 'animate-bounce-slow' : ''}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: 0.1
            }}
          >
            {emoji}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-7xl font-black mb-6 bg-clip-text text-transparent gradient-rainbow ${isPartyMode ? 'animate-wiggle' : ''}`}>
            🎉 SUPER FUN APP! 🎉
          </h1>
          <p className="text-2xl text-muted-foreground mb-4">
            Welcome to the most amazing, colorful, and fun experience ever! ✨
          </p>
          <Badge variant="secondary" className="text-lg px-4 py-2 animate-pulse">
            Fun Level: {clickCount < 5 ? 'Getting Started' : 'PARTY MODE!'} 🎊
          </Badge>
        </div>

        {/* Interactive Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 w-full max-w-4xl">
          <Card className={`p-6 text-center bg-gradient-to-br from-fun-pink to-fun-purple text-white hover:scale-105 transition-all duration-300 ${isPartyMode ? 'animate-bounce-slow' : ''}`}>
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="text-xl font-bold mb-2">Colorful Design</h3>
            <p>Beautiful gradients and vibrant colors everywhere!</p>
          </Card>

          <Card className={`p-6 text-center bg-gradient-to-br from-fun-blue to-fun-cyan text-white hover:scale-105 transition-all duration-300 ${isPartyMode ? 'animate-bounce-slow' : ''}`} style={{ animationDelay: '0.2s' }}>
            <div className="text-4xl mb-4">✨</div>
            <h3 className="text-xl font-bold mb-2">Amazing Animations</h3>
            <p>Everything moves and dances with style!</p>
          </Card>

          <Card className={`p-6 text-center bg-gradient-to-br from-fun-green to-fun-yellow text-white hover:scale-105 transition-all duration-300 ${isPartyMode ? 'animate-bounce-slow' : ''}`} style={{ animationDelay: '0.4s' }}>
            <div className="text-4xl mb-4">🎵</div>
            <h3 className="text-xl font-bold mb-2">Interactive Fun</h3>
            <p>Click around and discover magical surprises!</p>
          </Card>
        </div>

        {/* Fun Buttons */}
        <div className="flex flex-wrap gap-4 justify-center mb-8">
          <Button 
            onClick={handleFunClick}
            className={`bg-gradient-to-r from-fun-pink via-fun-purple to-fun-blue text-white text-lg px-8 py-4 hover:scale-110 transition-all duration-300 ${clickCount > 0 ? 'animate-pulse-rainbow' : ''}`}
          >
            🎉 Click for Fun! ({clickCount})
          </Button>
          
          <Button 
            variant="secondary"
            className="bg-gradient-to-r from-fun-orange to-fun-yellow text-white text-lg px-8 py-4 hover:scale-110 transition-all duration-300 animate-wiggle"
          >
            🌈 Rainbow Magic
          </Button>
          
          <Button 
            variant="outline"
            className="border-2 border-fun-purple text-fun-purple hover:bg-fun-purple hover:text-white text-lg px-8 py-4 hover:scale-110 transition-all duration-300"
          >
            ✨ Sparkle Time
          </Button>
        </div>

        {/* Party Mode Message */}
        {isPartyMode && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 animate-fade-in">
            <div className="bg-gradient-to-br from-fun-pink via-fun-purple to-fun-blue p-8 rounded-3xl text-white text-center animate-bounce-slow">
              <div className="text-8xl mb-4">🎊🎉🎊</div>
              <h2 className="text-4xl font-black mb-4">PARTY MODE ACTIVATED!</h2>
              <p className="text-xl">You've unlocked the ultimate fun experience! 🎈</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-muted-foreground">
          <p className="text-lg mb-2">Built with 💜 and lots of ✨ magic</p>
          <div className="flex justify-center gap-2 text-2xl animate-float">
            🦄 🌈 ⭐ 🎭 🎪 🎨 🎵 🎈
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
