package com.capstone.backend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT Token Provider
 * - Token generation: ACTIVE (프론트엔드 개발용)
 * - Token validation: DISABLED (주석 처리됨)
 *
 * 사용법:
 * - 로그인/회원가입 시 JWT 토큰을 받습니다
 * - API 요청 시 Authorization 헤더에 "Bearer {token}" 형식으로 전송
 * - 현재는 검증하지 않으므로 모든 요청이 허용됩니다
 */
@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private long jwtExpirationMs;

    private SecretKey key;

    @PostConstruct
    public void init() {
        this.key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * JWT 토큰 생성 (활성화)
     * 프론트엔드에서 사용할 수 있도록 실제 JWT 토큰을 생성합니다.
     */
    public String generateToken(String username) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(key)
                .compact();
    }

    /* ============================================
     * JWT 검증 기능 (현재 비활성화)
     * 프론트엔드 개발 완료 후 아래 주석 해제
     * ============================================

    public String getUsernameFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();

        return claims.getSubject();
    }

    public boolean validateToken(String authToken) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(authToken);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
    */
}
