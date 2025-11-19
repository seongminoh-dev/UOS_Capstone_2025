package com.capstone.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Capstone Backend API")
                        .description("Spring Boot REST API for Capstone Project - Scene Management System")
                        .version("v1.0.0")
                        .contact(new Contact()
                                .name("Capstone Team")
                                .email("capstone@example.com")))
                .servers(List.of(
                        new Server()
                                .url("http://localhost:8080/api")
                                .description("Local Development Server")
                ))
                .components(new Components()
                        .addSecuritySchemes("bearer-jwt",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("""
                                                JWT 인증 토큰 (프론트엔드 개발용)

                                                [사용 방법]
                                                1. POST /auth/login 또는 /auth/signup 으로 로그인/회원가입
                                                2. 응답의 "token" 필드에서 JWT 토큰 획득
                                                3. Authorization 헤더에 "Bearer {token}" 형식으로 전송
                                                   예: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

                                                [현재 상태]
                                                - JWT 토큰 생성: 활성화 ✓
                                                - JWT 토큰 검증: 비활성화 (모든 요청 허용)

                                                프론트엔드 개발 중에는 토큰 없이도 모든 API 사용 가능합니다.
                                                """)))
                .addSecurityItem(new SecurityRequirement().addList("bearer-jwt"));
    }
}
